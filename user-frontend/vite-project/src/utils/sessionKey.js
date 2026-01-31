import nacl from "tweetnacl";
import bs58 from "bs58";

const STORAGE_PREFIX = "autoswap_session_key";

/**
 * Creates a new ephemeral signing keypair (session key)
 */
export function createSessionKey() {
  const kp = nacl.sign.keyPair();

  return {
    publicKey: bs58.encode(kp.publicKey),
    secretKey: bs58.encode(kp.secretKey),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Save session key to localStorage (scoped per wallet)
 */
export function saveSessionKey(walletAddress, session) {
  localStorage.setItem(
    `${STORAGE_PREFIX}:${walletAddress}`,
    JSON.stringify(session)
  );
}

/**
 * Load session key from localStorage
 */
export function loadSessionKey(walletAddress) {
  const raw = localStorage.getItem(
    `${STORAGE_PREFIX}:${walletAddress}`
  );

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse session key", err);
    return null;
  }
}

/**
 * Optional helper — clear session
 */
export function clearSessionKey(walletAddress) {
  localStorage.removeItem(
    `${STORAGE_PREFIX}:${walletAddress}`
  );
}
