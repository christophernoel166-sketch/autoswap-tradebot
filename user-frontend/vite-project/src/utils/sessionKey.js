import { Keypair } from "@solana/web3.js";

/**
 * Generates a temporary session keypair for auto trading
 * This key NEVER holds user funds
 */
export function createSessionKey() {
  const keypair = Keypair.generate();

  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey), // Uint8Array → JSON-safe
    createdAt: Date.now(),
  };
}

/**
 * Store session key securely in sessionStorage
 */
export function saveSessionKey(sessionKey) {
  sessionStorage.setItem(
    "autoTradeSessionKey",
    JSON.stringify(sessionKey)
  );
}

/**
 * Load session key from storage
 */
export function loadSessionKey() {
  const raw = sessionStorage.getItem("autoTradeSessionKey");
  return raw ? JSON.parse(raw) : null;
}

/**
 * Clear session key (logout / revoke)
 */
export function clearSessionKey() {
  sessionStorage.removeItem("autoTradeSessionKey");
}
