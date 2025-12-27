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

const SLIPPAGE_BPS = config.solana.slippageBps;

/* =========================================================
   QUOTE
========================================================= */
export async function getQuote(inputMint, outputMint, amountLamports) {
  try {
    return await jupiter.quoteGet({
      inputMint,
      outputMint,
      amount: amountLamports,
      slippageBps: SLIPPAGE_BPS,
      restrictIntermediateTokens: true,
    });
  } catch (err) {
    console.error("[getQuote] Error:", err?.message ?? err);
    return null;
  }
}

/* =========================================================
   EXECUTE SWAP
========================================================= */
export async function executeSwap(wallet, quote) {
  try {
    const connection = getConnection();

    const swapRes = await jupiter.swapPost({
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        asLegacyTransaction: true,
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
   PRICE CHECK
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
   SELL PARTIAL
========================================================= */
export async function sellPartial(wallet, mint, percent) {
  const connection = getConnection();

  const accounts = await connection.getTokenAccountsByOwner(
    wallet.publicKey,
    { mint: new PublicKey(mint) }
  );

  if (!accounts.value.length) {
    throw new Error("No token account found");
  }

  const bal = await connection.getTokenAccountBalance(
    accounts.value[0].pubkey
  );

  const amountRaw = Math.floor(
    (Number(bal.value.amount) * percent) / 100
  );

  if (amountRaw <= 0) {
    throw new Error("Nothing to sell");
  }

  const quote = await getQuote(
    mint,
    "So11111111111111111111111111111111111111112",
    amountRaw
  );

  return executeSwap(wallet, quote);
}

/* =========================================================
   SELL ALL
========================================================= */
export async function sellAll(wallet, mint) {
  const connection = getConnection();

  const accounts = await connection.getTokenAccountsByOwner(
    wallet.publicKey,
    { mint: new PublicKey(mint) }
  );

  if (!accounts.value.length) {
    throw new Error("No token account found");
  }

  const bal = await connection.getTokenAccountBalance(
    accounts.value[0].pubkey
  );

  const amountRaw = Number(bal.value.amount);
  if (amountRaw <= 0) {
    throw new Error("No balance to sell");
  }

  const quote = await getQuote(
    mint,
    "So11111111111111111111111111111111111111112",
    amountRaw
  );

  return executeSwap(wallet, quote);
}
