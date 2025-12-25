// solanaUtils.js
// Safe, lazy Solana utilities (Railway-friendly)

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import dotenv from "dotenv";

dotenv.config();

const SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS || 100);

// 🔒 LAZY connection (IMPORTANT)
let connection = null;

function getConnection() {
  if (!connection) {
    const rpc = process.env.RPC_URL;
    if (!rpc || !rpc.startsWith("http")) {
      throw new Error("RPC_URL is missing or invalid");
    }
    connection = new Connection(rpc, "confirmed");
    console.log("✅ Solana RPC connected");
  }
  return connection;
}

// Jupiter client (safe at import)
const jupiter = createJupiterApiClient({
  baseUrl: "https://quote-api.jup.ag/v6",
  defaultHeaders: { "x-api-user": "mainnet" },
});

/////////////////////// QUOTE FETCH ///////////////////////
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
    console.error("[getQuote]", err?.message ?? err);
    return null;
  }
}

/////////////////////// SWAP EXECUTION ///////////////////////
export async function executeSwap(wallet, quote) {
  const conn = getConnection();

  const swapRes = await jupiter.swapPost({
    swapRequest: {
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      asLegacyTransaction: true,
    },
  });

  const tx = VersionedTransaction.deserialize(
    Buffer.from(swapRes.swapTransaction, "base64")
  );

  tx.sign([wallet]);
  return await conn.sendTransaction(tx, { skipPreflight: true });
}

/////////////////////// PRICE FETCH ///////////////////////
export async function getCurrentPrice(mint) {
  try {
    const quote = await jupiter.quoteGet({
      inputMint: "So11111111111111111111111111111111111111112",
      outputMint: mint,
      amount: LAMPORTS_PER_SOL,
    });

    return 1 / (Number(quote.outAmount) / LAMPORTS_PER_SOL);
  } catch (err) {
    console.error("[getCurrentPrice]", err?.message ?? err);
    return null;
  }
}

/////////////////////// SELL PARTIAL ///////////////////////
export async function sellPartial(wallet, mint, percent) {
  const conn = getConnection();

  const accounts = await conn.getTokenAccountsByOwner(
    wallet.publicKey,
    { mint: new PublicKey(mint) }
  );

  if (!accounts.value.length) throw new Error("No token account");

  const bal = await conn.getTokenAccountBalance(accounts.value[0].pubkey);
  const sellAmount = Math.floor(
    (Number(bal.value.amount) * percent) / 100
  );

  if (sellAmount <= 0) throw new Error("Nothing to sell");

  const quote = await jupiter.quoteGet({
    inputMint: mint,
    outputMint: "So11111111111111111111111111111111111111112",
    amount: sellAmount,
    slippageBps: SLIPPAGE_BPS,
  });

  return executeSwap(wallet, quote);
}

/////////////////////// SELL ALL ///////////////////////
export async function sellAll(wallet, mint) {
  const conn = getConnection();

  const accounts = await conn.getTokenAccountsByOwner(
    wallet.publicKey,
    { mint: new PublicKey(mint) }
  );

  if (!accounts.value.length) throw new Error("No token account");

  const bal = await conn.getTokenAccountBalance(accounts.value[0].pubkey);
  const amount = Number(bal.value.amount);

  if (amount <= 0) throw new Error("No balance");

  const quote = await jupiter.quoteGet({
    inputMint: mint,
    outputMint: "So11111111111111111111111111111111111111112",
    amount,
    slippageBps: SLIPPAGE_BPS,
  });

  return executeSwap(wallet, quote);
}
