// src/solana/internalWallet.js
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const rawKey = process.env.TRADING_WALLET_PRIVATE_KEY;

if (!rawKey) {
  throw new Error("❌ TRADING_WALLET_PRIVATE_KEY not set");
}

let secretKey;

try {
  const trimmed = rawKey.trim();

  // ✅ Phantom / Solflare JSON array format
  if (trimmed.startsWith("[")) {
    secretKey = Uint8Array.from(JSON.parse(trimmed));
  }
  // ✅ Base58 format (still supported)
  else {
    secretKey = bs58.decode(trimmed);
  }
} catch (err) {
  throw new Error("❌ Invalid TRADING_WALLET_PRIVATE_KEY format");
}

export const INTERNAL_TRADING_WALLET = Keypair.fromSecretKey(secretKey);

console.log(
  "🔐 Internal trading wallet loaded:",
  INTERNAL_TRADING_WALLET.publicKey.toBase58()
);
