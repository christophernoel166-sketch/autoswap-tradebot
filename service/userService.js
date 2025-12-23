import mongoose from "mongoose";
import argon2 from "argon2";
import crypto from "crypto";
import fs from "fs";

const userSchema = new mongoose.Schema({
  tgId: { type: String, index: true, unique: true },
  username: String,
  encryptedWallet: String, // base64 encrypted JSON
  salt: String, // for wallet encryption
  sessionUnlocked: { type: Boolean, default: false },
  sessionKey: String, // session encryption key
  sessionExpire: Date,
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);

// AES encryption helpers
function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let enc = cipher.update(text, "utf8", "base64");
  enc += cipher.final("base64");
  const tag = cipher.getAuthTag().toString("base64");
  return JSON.stringify({ iv: iv.toString("base64"), tag, data: enc });
}

function decrypt(jsonStr, key) {
  const { iv, tag, data } = JSON.parse(jsonStr);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  let dec = decipher.update(data, "base64", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

// Utility to derive a 32-byte key from a password + salt
async function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
}

// ───────────────────────────────────────────────
// 🧩 USER FUNCTIONS
// ───────────────────────────────────────────────

// Create or update a user record
export async function upsertUser(tgId, username = "") {
  return User.findOneAndUpdate(
    { tgId },
    { username },
    { upsert: true, new: true }
  );
}

// Save encrypted wallet
export async function saveEncryptedWallet(tgId, walletJson, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  const encrypted = encrypt(walletJson, key);
  await User.findOneAndUpdate(
    { tgId },
    { encryptedWallet: encrypted, salt },
    { upsert: true }
  );
}

// Unlock a session (12h default)
export async function openSession(tgId, password) {
  const u = await User.findOne({ tgId });
  if (!u || !u.encryptedWallet) throw new Error("Wallet not set.");
  const key = await deriveKey(password, u.salt);
  // test decryption to verify password
  decrypt(u.encryptedWallet, key);
  const sessionKey = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + 12 * 3600 * 1000);
  await User.updateOne(
    { tgId },
    { sessionUnlocked: true, sessionKey, sessionExpire: expire }
  );
  return true;
}

// Close session
export async function closeSession(tgId) {
  await User.updateOne(
    { tgId },
    { sessionUnlocked: false, sessionKey: null, sessionExpire: null }
  );
  return true;
}

// Get decrypted wallet array
export async function getDecryptedWalletArray(tgId, password) {
  const u = await User.findOne({ tgId });
  if (!u) throw new Error("User not found.");
  if (!u.encryptedWallet) throw new Error("Wallet not uploaded.");
  const key = await deriveKey(password, u.salt);
  const decrypted = decrypt(u.encryptedWallet, key);
  const arr = JSON.parse(decrypted);
  if (!Array.isArray(arr)) throw new Error("Invalid wallet format.");
  return arr;
}
