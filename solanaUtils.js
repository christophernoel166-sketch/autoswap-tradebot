// solanaUtils.js
// Helper utilities for Solana auto-trading bot
// Handles Jupiter quotes, swap execution, and partial/full sells.

import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS || 100);
const connection = new Connection(RPC_URL, "confirmed");

// Initialize Jupiter client
const jupiter = createJupiterApiClient({
  baseUrl: "https://quote-api.jup.ag/v6",
  defaultHeaders: { "x-api-user": "mainnet" },
});

/////////////////////// QUOTE FETCH ///////////////////////
export async function getQuote(inputMint, outputMint, amountLamports) {
  try {
    const quote = await jupiter.quoteGet({
      inputMint,
      outputMint,
      amount: amountLamports,
      slippageBps: SLIPPAGE_BPS,
      restrictIntermediateTokens: true,
      onlyDirectRoutes: false,
    });
    return quote;
  } catch (err) {
    console.error("[utils:getQuote] Error fetching quote:", err?.message ?? err);
    return null;
  }
}

/////////////////////// SWAP EXECUTION ///////////////////////
export async function executeSwap(wallet, quote) {
  try {
    const swapReq = {
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        asLegacyTransaction: true,
      },
    };
    const swapRes = await jupiter.swapPost(swapReq);
    if (!swapRes || !swapRes.swapTransaction) throw new Error("No swap transaction returned from Jupiter");

    const swapBuf = Buffer.from(swapRes.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(swapBuf);
    tx.sign([wallet]);
    const txid = await connection.sendTransaction(tx, { skipPreflight: true });
    console.log("✅ Swap executed:", txid);
    return txid;
  } catch (err) {
    console.error("[utils:executeSwap] Error executing swap:", err?.message ?? err);
    throw err;
  }
}

/////////////////////// CURRENT PRICE FETCH ///////////////////////
export async function getCurrentPrice(mintAddress) {
  try {
    const quote = await jupiter.quoteGet({
      inputMint: "So11111111111111111111111111111111111111112", // SOL
      outputMint: mintAddress,
      amount: Math.floor(1 * LAMPORTS_PER_SOL),
    });
    if (!quote || !quote.outAmount) throw new Error("No valid quote for price check");
    const price = 1 / (Number(quote.outAmount) / LAMPORTS_PER_SOL);
    console.log(`[utils:getCurrentPrice] ${mintAddress} ≈ ${price.toFixed(6)} SOL`);
    return price;
  } catch (err) {
    console.error("[utils:getCurrentPrice] Error:", err?.message ?? err);
    return null;
  }
}

/////////////////////// SELL PARTIAL ///////////////////////
export async function sellPartial(wallet, mint, percent) {
  try {
    const resp = await connection.getTokenAccountsByOwner(wallet.publicKey, { mint: new PublicKey(mint) });
    if (!resp?.value?.length) throw new Error("No token account found.");
    const first = resp.value[0];
    const bal = await connection.getTokenAccountBalance(first.pubkey);
    const sellAmountRaw = Math.floor((Number(bal.value.amount) * percent) / 100);

    if (sellAmountRaw <= 0) throw new Error("Nothing to sell for given percent.");

    const quote = await jupiter.quoteGet({
      inputMint: mint,
      outputMint: "So11111111111111111111111111111111111111112", // SOL
      amount: sellAmountRaw,
      slippageBps: SLIPPAGE_BPS,
      restrictIntermediateTokens: true,
    });

    const swapReq = {
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        asLegacyTransaction: true,
      },
    };

    const swapRes = await jupiter.swapPost(swapReq);
    const swapBuf = Buffer.from(swapRes.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(swapBuf);
    tx.sign([wallet]);
    const txid = await connection.sendTransaction(tx, { skipPreflight: true });
    console.log(`✅ Partial sell (${percent}%) txid:`, txid);
    return txid;
  } catch (err) {
    console.error("[utils:sellPartial] Error:", err?.message ?? err);
    throw err;
  }
}

/////////////////////// SELL ALL ///////////////////////
export async function sellAll(wallet, mint) {
  try {
    const resp = await connection.getTokenAccountsByOwner(wallet.publicKey, { mint: new PublicKey(mint) });
    if (!resp?.value?.length) throw new Error("No token account found.");
    const first = resp.value[0];
    const bal = await connection.getTokenAccountBalance(first.pubkey);
    const sellAmountRaw = Number(bal.value.amount);

    if (sellAmountRaw <= 0) throw new Error("No balance to sell.");

    const quote = await jupiter.quoteGet({
      inputMint: mint,
      outputMint: "So11111111111111111111111111111111111111112",
      amount: sellAmountRaw,
      slippageBps: SLIPPAGE_BPS,
      restrictIntermediateTokens: true,
    });

    const swapReq = {
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        asLegacyTransaction: true,
      },
    };

    const swapRes = await jupiter.swapPost(swapReq);
    const swapBuf = Buffer.from(swapRes.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(swapBuf);
    tx.sign([wallet]);
    const txid = await connection.sendTransaction(tx, { skipPreflight: true });
    console.log("✅ Full sell txid:", txid);
    return txid;
  } catch (err) {
    console.error("[utils:sellAll] Error:", err?.message ?? err);
    throw err;
  }
}
