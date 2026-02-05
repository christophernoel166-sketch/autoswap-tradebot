// src/solana/internalWallet.js
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

if (!process.env.TRADING_WALLET_PRIVATE_KEY) {
  throw new Error("❌ TRADING_WALLET_PRIVATE_KEY not set");
}

// Expect base58-encoded secret key
const secretKey = bs58.decode(process.env.TRADING_WALLET_PRIVATE_KEY);

export const INTERNAL_TRADING_WALLET = Keypair.fromSecretKey(secretKey);
