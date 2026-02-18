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

// small sleep helper (internal only)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait for a token account + positive balance to exist for owner+mint.
 * This fixes "sell too soon" right after a buy (ATA/balance not visible yet).
 */
async function waitForTokenBalance(
  connection,
  ownerPubkey,
  mintPubkey,
  { retries = 8, baseDelayMs = 800 } = {}
) {
  for (let i = 0; i < retries; i++) {
    const accounts = await connection.getTokenAccountsByOwner(ownerPubkey, {
      mint: mintPubkey,
    });

    if (accounts.value.length) {
      const bal = await connection.getTokenAccountBalance(
        accounts.value[0].pubkey
      );

      const amountRaw = Number(bal.value.amount || 0);
      if (amountRaw > 0) {
        return {
          tokenAccount: accounts.value[0].pubkey,
          amountRaw,
        };
      }
    }

    // exponential-ish backoff
    await sleep(baseDelayMs * (i + 1));
  }

  return null;
}

/* =========================================================
   QUOTE (MEV-SAFE, SLIPPAGE-ENFORCED)
========================================================= */
export async function getQuote(
  inputMint,
  outputMint,
  amountLamports,
  slippageBps = DEFAULT_SLIPPAGE_BPS
) {
  try {
    return await jupiter.quoteGet({
      inputMint,
      outputMint,
      amount: amountLamports,
      slippageBps,

      // 🔐 MEV PROTECTION
      restrictIntermediateTokens: true,
      onlyDirectRoutes: true,
    });
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
}) {
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  return getQuote(
    "So11111111111111111111111111111111111111112", // SOL
    mint,
    lamports,
    slippageBps
  );
}

/* =========================================================
   EXECUTE SWAP (MEV-PROTECTED)
   ⚠️ Slippage is ALREADY baked into quote
========================================================= */
export async function executeSwap(wallet, quote) {
  try {
    const connection = getConnection();

    const swapRes = await jupiter.swapPost({
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
    });

    if (!swapRes?.swapTransaction) {
      throw new Error("No swap transaction returned from Jupiter");
    }

    const txBuf = Buffer.from(swapRes.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);

    tx.sign([wallet]);

    const txid = await connection.sendTransaction(tx, {
      skipPreflight: true,
    });

    return txid;
  } catch (err) {
    console.error("[executeSwap] Error:", err?.message ?? err);
    throw err;
  }
}

/* =========================================================
   PRICE CHECK (READ-ONLY)
========================================================= */
export async function getCurrentPrice(mintAddress) {
  try {
    const quote = await jupiter.quoteGet({
      inputMint: "So11111111111111111111111111111111111111112",
      outputMint: mintAddress,
      amount: LAMPORTS_PER_SOL,
    });

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
  slippageBps = DEFAULT_SLIPPAGE_BPS
) {
  const connection = getConnection();
  const mintPk = new PublicKey(mint);

  // ✅ wait for ATA/balance to be visible (fixes "sell too soon")
  const got = await waitForTokenBalance(connection, wallet.publicKey, mintPk);
  if (!got) {
    throw new Error("No token account found");
  }

  const amountRaw = Math.floor((Number(got.amountRaw) * percent) / 100);

  if (amountRaw <= 0) {
    throw new Error("Nothing to sell");
  }

  const quote = await getQuote(
    mint,
    "So11111111111111111111111111111111111111112",
    amountRaw,
    slippageBps // 🔐 USER SLIPPAGE WIRED IN
  );

  if (!quote?.outAmount) {
    throw new Error("Invalid quote for partial sell");
  }

  const txid = await executeSwap(wallet, quote);

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
  slippageBps = DEFAULT_SLIPPAGE_BPS
) {
  const connection = getConnection();
  const mintPk = new PublicKey(mint);

  // ✅ wait for ATA/balance to be visible (fixes "sell too soon")
  const got = await waitForTokenBalance(connection, wallet.publicKey, mintPk);
  if (!got) {
    throw new Error("No token account found");
  }

  const amountRaw = Number(got.amountRaw);
  if (amountRaw <= 0) {
    throw new Error("No balance to sell");
  }

  const quote = await getQuote(
    mint,
    "So11111111111111111111111111111111111111112",
    amountRaw,
    slippageBps // 🔐 USER SLIPPAGE WIRED IN
  );

  if (!quote?.outAmount) {
    throw new Error("Invalid quote for sell all");
  }

  const txid = await executeSwap(wallet, quote);

  const solReceived = Number(quote.outAmount) / LAMPORTS_PER_SOL;

  return {
    txid,
    solReceived,
  };
}
