import { Connection, Keypair, clusterApiUrl, LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🚀 Starting Solana Auto-Trader...");

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const secretKey = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, "utf8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log("Using wallet:", wallet.publicKey.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("💰 Wallet balance:", balance / LAMPORTS_PER_SOL, "SOL");

  const jupiter = createJupiterApiClient({
    baseUrl: "https://quote-api.jup.ag/v6",
    defaultHeaders: { "x-api-user": "devnet" },
  });

  const inputMint = "So11111111111111111111111111111111111111112"; // SOL
  const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC (Devnet supported)
  const amount = 0.01 * LAMPORTS_PER_SOL;
  const slippageBps = 50;

  console.log(`🔄 Fetching best route for 0.01 SOL → USDC...`);
  const quoteResponse = await jupiter.quoteGet({
    inputMint,
    outputMint,
    amount,
    slippageBps,
    restrictIntermediateTokens: true, // keep routes simple for devnet
    onlyDirectRoutes: true,           // avoid multi-hop routes using ALTs
  });

  if (!quoteResponse || !quoteResponse.outAmount) {
    throw new Error("❌ No valid quote returned from Jupiter API.");
  }

  console.log("✅ Best route found:", quoteResponse.outAmount / 1e6, "USDC");

  console.log("🧱 Building transaction...");
  const swapResponse = await jupiter.swapPost({
    swapRequest: {
      quoteResponse,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      asLegacyTransaction: true, // 👈 THIS disables address tables (fixes your issue)
    },
  });

  const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  console.log("✍️ Signing transaction...");
  transaction.sign([wallet]);

  console.log("🚀 Sending transaction to Solana...");
  const txid = await connection.sendTransaction(transaction, { skipPreflight: true });

  console.log("✅ Swap submitted! Txid:", txid);
  console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${txid}?cluster=devnet`);
}

main().catch((err) => {
  console.error("❌ Error executing auto trade:", err);
});
