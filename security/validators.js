// security/validators.js
import { PublicKey } from "@solana/web3.js";

/**
 * Validate if a string is a valid Solana public key (token mint, wallet, etc.)
 */
export function isValidMint(address) {
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate if a number is a positive value
 */
export function isPositiveNumber(value) {
  const n = Number(value);
  return !isNaN(n) && n > 0;
}

/**
 * Validate Solana address format (42–44 characters)
 */
export function isValidSolanaAddress(address) {
  return typeof address === "string" && address.length >= 32 && address.length <= 44;
}
