// src/services/walletService.js

import crypto from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error(
    "WALLET_ENCRYPTION_KEY must be set and exactly 32 characters long"
  );
}

/**
 * ===================================================
 * 🔐 Encrypt Private Key
 * ===================================================
 */
function encryptPrivateKey(secretKeyUint8) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKeyUint8)),
    cipher.final(),
  ]);

  return {
    encryptedPrivateKey: encrypted.toString("hex"),
    iv: iv.toString("hex"),
  };
}

/**
 * ===================================================
 * 🔓 Decrypt Private Key
 * ===================================================
 */
export function decryptPrivateKey(encryptedHex, ivHex) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(ivHex, "hex")
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return Uint8Array.from(decrypted);
}

/**
 * ===================================================
 * 🚀 Generate New Trading Wallet
 * ===================================================
 */
export function generateTradingWallet() {
  const keypair = Keypair.generate();

  const { encryptedPrivateKey, iv } = encryptPrivateKey(
    keypair.secretKey
  );

  return {
    publicKey: keypair.publicKey.toBase58(),
    encryptedPrivateKey,
    iv,
  };
}

/**
 * ===================================================
 * 🧠 Restore Wallet from DB
 * ===================================================
 */
export function restoreTradingWallet(user) {
  if (
    !user.tradingWalletEncryptedPrivateKey ||
    !user.tradingWalletIv
  ) {
    throw new Error("User trading wallet not initialized");
  }

  const secretKey = decryptPrivateKey(
    user.tradingWalletEncryptedPrivateKey,
    user.tradingWalletIv
  );

  return Keypair.fromSecretKey(secretKey);
}
