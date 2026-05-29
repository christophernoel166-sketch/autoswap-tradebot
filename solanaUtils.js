// solanaUtils.js
// Solana helper utilities
// IMPORTANT: No Solana connection is created at import time

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import { config } from "./config.js";

/**
 * Lazy Solana connection
 * Created only when needed
 */
let _connection = null;

function getConnection() {
  if (_connection) return _connection;

  const rpcUrl = config.solana.rpcUrl;

  if (!rpcUrl) {
    throw new Error("❌ Solana RPC URL is missing");
  }

  if (!rpcUrl.startsWith("http://") && !rpcUrl.startsWith("https://")) {
    throw new Error(`❌ Invalid Solana RPC URL: ${rpcUrl}`);
  }

  _connection = new Connection(rpcUrl, "confirmed");
  return _connection;
}

// Jupiter client (safe to init at load time)
const jupiter = createJupiterApiClient({
  baseUrl: "https://quote-api.jup.ag/v6",
  defaultHeaders: { "x-api-user": "mainnet" },
});

// Global fallback slippage (bps)
const DEFAULT_SLIPPAGE_BPS = config.solana.slippageBps ?? 200;

// -------------------------
// Step 2 Diagnostics helpers
// -------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function logWithTrace(level, ctx, msg, extra = {}) {
  const traceId = ctx?.traceId;
  const payload = traceId ? { traceId, ...extra } : extra;

  // Keep simple console logging to avoid changing your pino wiring
  if (level === "error") console.error(msg, payload);
  else if (level === "warn") console.warn(msg, payload);
  else console.log(msg, payload);
}

/**
 * Attempts to extract useful HTTP-ish data from errors thrown by the Jupiter client.
 * Different versions/layers attach different shapes, so we safely probe.
 */
async function extractHttpDetails(err) {
  const out = {
    status: undefined,
    retryAfter: undefined,
    message: err?.message,
    name: err?.name,
  };

  // Common patterns: err.status / err.response.status / err.cause.status
  out.status =
    err?.status ??
    err?.response?.status ??
    err?.cause?.status ??
    err?.cause?.response?.status;

  // Retry-After header (if present)
  out.retryAfter =
    err?.response?.headers?.get?.("retry-after") ??
    err?.cause?.response?.headers?.get?.("retry-after") ??
    err?.headers?.get?.("retry-after");

  // Attempt to read body text (if a Response exists)
  // We have to be careful not to consume streams twice; best-effort only.
  try {
    const resp = err?.response ?? err?.cause?.response;
    if (resp?.clone && resp?.text) {
      const cloned = resp.clone();
      out.bodyText = await cloned.text();
    }
  } catch {
    // ignore
  }

  // Some libs attach JSON directly
  out.data = err?.data ?? err?.response?.data ?? err?.cause?.data;

  return out;
}

/**
 * Wrap Jupiter API calls so when we hit 429 we can see the exact details.
 * NOTE: We are NOT "fixing" rate limits here — only diagnosing.
 */
async function jupiterCall(label, fn, ctx) {
  const t0 = Date.now();
  try {
    const res = await fn();
    logWithTrace("log", ctx, `🧪 Jupiter OK: ${label}`, {
      ms: Date.now() - t0,
    });
    return res;
  } catch (err) {
    const http = await extractHttpDetails(err);

    logWithTrace("error", ctx, `🧪 Jupiter FAIL: ${label}`, {
      ms: Date.now() - t0,
      status: http.status,
      retryAfter: http.retryAfter,
      name: http.name,
      message: http.message,
      // show a SMALL preview of body if present (avoid massive logs)
      bodyPreview:
        typeof http.bodyText === "string"
          ? http.bodyText.slice(0, 300)
          : undefined,
      hasData: http.data ? true : false,
    });

    // Keep the existing behavior: throw so callers can decide what to do
    throw err;
  }
}

/* =========================================================
   QUOTE (MEV-SAFE, SLIPPAGE-ENFORCED)
========================================================= */
export async function getQuote(
  inputMint,
  outputMint,
  amountLamports,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  ctx = undefined // optional diagnostics context
) {
  try {
    return await jupiterCall(
      "quoteGet",
      () =>
        jupiter.quoteGet({
          inputMint,
          outputMint,
          amount: amountLamports,
          slippageBps,

          // 🔐 MEV PROTECTION
          restrictIntermediateTokens: true,
          onlyDirectRoutes: true,
        }),
      ctx
    );
  } catch (err) {
    console.error("[getQuote] Error:", err?.message ?? err);
    return null;
  }
}

/* =========================================================
   🆕 BUY QUOTE (USER SLIPPAGE AWARE)
   🔐 THIS IS THE ONLY PLACE USER SLIPPAGE IS APPLIED
========================================================= */
export async function getBuyQuote({
  mint,
  solAmount,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  ctx = undefined,
}) {
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  return getQuote(
    "So11111111111111111111111111111111111111112", // SOL
    mint,
    lamports,
    slippageBps,
    ctx
  );
}

/* =========================================================
   EXECUTE SWAP (MEV-PROTECTED)
   ⚠️ Slippage is ALREADY baked into quote
========================================================= */
export async function executeSwap(wallet, quote, ctx = undefined) {
  try {
    const connection = getConnection();

    logWithTrace("log", ctx, "🧪 executeSwap: start", {
      wallet: wallet?.publicKey?.toBase58?.(),
      hasQuote: !!quote,
      hasRoutePlan: !!quote?.routePlan,
      outAmount: quote?.outAmount,
    });

    const swapRes = await jupiterCall(
      "swapPost",
      () =>
        jupiter.swapPost({
          swapRequest: {
            quoteResponse: quote,
            userPublicKey: wallet.publicKey.toBase58(),
            wrapAndUnwrapSol: true,

            // 🔐 MEV PROTECTION
            dynamicComputeUnitLimit: true,
            asLegacyTransaction: false,

            prioritizationFeeLamports: {
              priorityLevelWithMaxLamports: {
                priorityLevel: "veryHigh",
                maxLamports: 1_500_000, // ~0.0015 SOL
              },
            },
          },
        }),
      ctx
    );

    if (!swapRes?.swapTransaction) {
      throw new Error("No swap transaction returned from Jupiter");
    }

    logWithTrace("log", ctx, "🧪 executeSwap: swapTransaction received", {
      swapTransactionBytes: swapRes.swapTransaction?.length ?? null,
    });

    const txBuf = Buffer.from(swapRes.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);

    tx.sign([wallet]);

    logWithTrace("log", ctx, "🧪 executeSwap: sending transaction", {
      skipPreflight: true,
    });

    const txid = await connection.sendTransaction(tx, {
      skipPreflight: true,
    });

    logWithTrace("log", ctx, "🧪 executeSwap: tx sent", { txid });

    // ===================================================
    // ✅ CONFIRM TRANSACTION LANDED (DIAGNOSTICS)
    // ===================================================
  let conf;

try {
  conf = await connection.confirmTransaction(
    txid,
    "confirmed"
  );
} catch (err) {

  logWithTrace(
    "warn",
    ctx,
    "⚠️ Confirmation timeout — checking actual chain status",
    {
      txid,
      message: err?.message,
    }
  );

  await sleep(5000);

  const retryStatus =
    await connection.getSignatureStatuses(
      [txid],
      {
        searchTransactionHistory: true,
      }
    );

  const sig =
    retryStatus?.value?.[0];

  if (
    sig &&
    (
      sig.confirmationStatus === "confirmed" ||
      sig.confirmationStatus === "finalized"
    ) &&
    !sig.err
  ) {

    logWithTrace(
      "warn",
      ctx,
      "✅ Transaction actually landed after timeout",
      {
        txid,
      }
    );

    conf = {
      value: {
        err: null,
      },
    };
  } else {
    throw err;
  }
}

logWithTrace(
  "log",
  ctx,
  "🧪 SWAP CONFIRM RESULT",
  conf
);

const st =
  await connection.getSignatureStatuses(
    [txid],
    {
      searchTransactionHistory: true,
    }
  );

    logWithTrace("log", ctx, "🧪 SWAP SIG STATUS", st?.value?.[0]);
// ===================================================
// 🔎 DIAGNOSE SWAP FAILURE (if any)
// ===================================================
const sigStatus = st?.value?.[0];
const confErr = conf?.value?.err ?? null;
const statusErr = sigStatus?.err ?? null;

if (confErr || statusErr) {
  logWithTrace("error", ctx, "❌ SWAP FAILED (confirmed with error)", {
    txid,
    confErr,
    statusErr,
    confirmationStatus: sigStatus?.confirmationStatus,
    slot: sigStatus?.slot,
  });

  try {
    const txInfo = await connection.getTransaction(txid, {
      maxSupportedTransactionVersion: 1,
      commitment: "confirmed",
    });

    logWithTrace("error", ctx, "❌ SWAP TX META ERR", {
      err: txInfo?.meta?.err ?? null,
    });

    const logs = txInfo?.meta?.logMessages ?? [];
    logWithTrace("error", ctx, "❌ SWAP TX LOGS (last 60)", {
      logsTail: logs.slice(-60),
    });
  } catch (e) {
    logWithTrace("error", ctx, "❌ Failed to fetch swap transaction details", {
      message: e?.message,
    });
  }

  // IMPORTANT: stop treating this as success
  throw new Error("Swap transaction confirmed with error (see logs)");
}


    return {
  txid,

  tokenAmount: quote?.outAmount
    ? Number(quote.outAmount)
    : 0,
};
  } catch (err) {
    console.error("[executeSwap] Error:", err?.message ?? err);
    throw err;
  }
}

/* =========================================================
   PRICE CHECK (READ-ONLY)
========================================================= */
export async function getCurrentPrice(mintAddress, ctx = undefined) {
  try {
    const quote = await jupiterCall(
      "quoteGet(price)",
      () =>
        jupiter.quoteGet({
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: mintAddress,
          amount: LAMPORTS_PER_SOL,
        }),
      ctx
    );

    if (!quote?.outAmount) return null;

    return 1 / (Number(quote.outAmount) / LAMPORTS_PER_SOL);
  } catch (err) {
    console.error("[getCurrentPrice] Error:", err?.message ?? err);
    return null;
  }
}

/* =========================================================
   SELL PARTIAL (NOW SLIPPAGE-AWARE, BACKWARD SAFE)
========================================================= */
export async function sellPartial(
  wallet,
  mint,
  percent,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  ctx = undefined
) {
  const connection = getConnection();

  logWithTrace("log", ctx, "🧪 sellPartial: start", {
    wallet: wallet?.publicKey?.toBase58?.(),
    mint,
    percent,
    slippageBps,
  });

  // 1) Token account discovery
  const accounts = await connection.getTokenAccountsByOwner(wallet.publicKey, {
    mint: new PublicKey(mint),
  });

  logWithTrace("log", ctx, "🧪 sellPartial: token accounts", {
    count: accounts?.value?.length ?? 0,
  });

  if (!accounts.value.length) {
    throw new Error("No token account found");
  }

  // 2) Balance read
  const bal = await connection.getTokenAccountBalance(accounts.value[0].pubkey);

  logWithTrace("log", ctx, "🧪 sellPartial: balance read", {
    amountRaw: bal?.value?.amount,
    decimals: bal?.value?.decimals,
    uiAmount: bal?.value?.uiAmount,
  });

  const amountRaw = Math.floor((Number(bal.value.amount) * percent) / 100);

  if (amountRaw <= 0) {
    throw new Error("Nothing to sell");
  }

  logWithTrace("log", ctx, "🧪 sellPartial: computed sell amount", {
    amountRaw,
  });

  // 3) Quote (token -> SOL)
  const quote = await getQuote(
    mint,
    "So11111111111111111111111111111111111111112",
    amountRaw,
    slippageBps,
    ctx
  );

  if (!quote?.outAmount) {
    throw new Error("Invalid quote for partial sell");
  }

  logWithTrace("log", ctx, "🧪 sellPartial: got quote", {
    outAmount: quote.outAmount,
    routePlanLen: quote?.routePlan?.length ?? null,
  });

  // 4) Execute swap
  const txid = await executeSwap(wallet, quote, ctx);

  const solReceived = Number(quote.outAmount) / LAMPORTS_PER_SOL;

  return {
    txid,
    solReceived,
  };
}

/* =========================================================
   SELL ALL (NOW SLIPPAGE-AWARE, BACKWARD SAFE)
========================================================= */
export async function sellAll(
  wallet,
  mint,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  ctx = undefined
) {
  const connection = getConnection();

  logWithTrace("log", ctx, "🧪 sellAll: start", {
    wallet: wallet?.publicKey?.toBase58?.(),
    mint,
    slippageBps,
  });

  // 1) Token account discovery
  const accounts = await connection.getTokenAccountsByOwner(wallet.publicKey, {
    mint: new PublicKey(mint),
  });

  logWithTrace("log", ctx, "🧪 sellAll: token accounts", {
    count: accounts?.value?.length ?? 0,
  });

  if (!accounts.value.length) {
    throw new Error("No token account found");
  }

  // 2) Balance read
  const bal = await connection.getTokenAccountBalance(accounts.value[0].pubkey);

  logWithTrace("log", ctx, "🧪 sellAll: balance read", {
    amountRaw: bal?.value?.amount,
    decimals: bal?.value?.decimals,
    uiAmount: bal?.value?.uiAmount,
  });

  const amountRaw = Number(bal.value.amount);
  if (amountRaw <= 0) {
    throw new Error("No balance to sell");
  }

  // 3) Quote (token -> SOL)
  const quote = await getQuote(
    mint,
    "So11111111111111111111111111111111111111112",
    amountRaw,
    slippageBps,
    ctx
  );

  if (!quote?.outAmount) {
    throw new Error("Invalid quote for sell all");
  }

  logWithTrace("log", ctx, "🧪 sellAll: got quote", {
    outAmount: quote.outAmount,
    routePlanLen: quote?.routePlan?.length ?? null,
  });

  // 4) Execute swap
  const txid = await executeSwap(wallet, quote, ctx);

  const solReceived = Number(quote.outAmount) / LAMPORTS_PER_SOL;

  return {
    txid,
    solReceived,
  };
}
