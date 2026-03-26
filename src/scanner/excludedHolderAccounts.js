// src/scanner/excludedHolderAccounts.js

/**
 * IMPORTANT:
 * These exclusions work best with the current lightweight holder scan
 * when the returned top-holder address matches one of these exact addresses.
 *
 * Add exact token-account / holder addresses here as you identify them.
 */

export const GLOBAL_EXCLUDED_HOLDER_ADDRESSES = [
  // Burn / null-like addresses if they ever appear
  "11111111111111111111111111111111",

  // Add known global protocol / exchange / vault / LP addresses here
  // Example placeholders:
  // "ADDRESS_1",
  // "ADDRESS_2",
];

/**
 * Per-token exclusions.
 * Key = token mint
 * Value = array of holder addresses to exclude for that mint
 */
export const EXCLUDED_HOLDER_ADDRESSES_BY_MINT = {
  // Example:
  // "TOKEN_MINT_HERE": [
  //   "PUMP_FUN_AMM_ADDRESS_HERE",
  //   "KNOWN_EXCHANGE_ADDRESS_HERE",
  // ],

  // Add your real exclusions here as you confirm them.
  // For example:
  // "H43xqMLiFLNLLGRhXKxJUVXdEe8uVdXs93Emo5Wzpump": [
  //   "PUT_PUMP_FUN_AMM_ADDRESS_HERE",
  //   "PUT_EXCHANGE_OR_PROTOCOL_ADDRESS_HERE",
  // ],
};

export function getExcludedHolderAddressesForMint(tokenMint) {
  const mint = typeof tokenMint === "string" ? tokenMint.trim() : "";
  const mintSpecific = EXCLUDED_HOLDER_ADDRESSES_BY_MINT[mint] || [];

  return [...new Set([...GLOBAL_EXCLUDED_HOLDER_ADDRESSES, ...mintSpecific])];
}