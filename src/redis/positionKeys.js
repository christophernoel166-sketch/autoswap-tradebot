/**
 * ===================================================
 * 📦 REDIS POSITION KEYS
 * ===================================================
 */

/**
 * Active positions set per wallet
 * (Tracks which mints a wallet currently holds)
 */
export function walletActiveSet(walletAddress) {
  return `wallet:active:${walletAddress}`;
}

/**
 * Individual position hash
 * (Stores entry, size, status, etc.)
 */
export function positionKey(walletAddress, mint) {
  return `position:${walletAddress}:${mint}`;
}

/**
 * Alias for wallet active set (used in some parts of code)
 */
export function walletPositionsKey(walletAddress) {
  return walletActiveSet(walletAddress);
}

/**
 * ===================================================
 * 📊 DASHBOARD SNAPSHOT KEY (NEW)
 * ===================================================
 * One compact JSON per wallet
 */
export function walletSnapshotKey(walletAddress) {
  return `wallet:snapshot:${walletAddress}`;
}

/**
 * ===================================================
 * 🧾 POSITION FIELDS (STANDARDIZED)
 * ===================================================
 */
export const POSITION_FIELDS = {
  walletAddress: "walletAddress",
  mint: "mint",
  sourceChannel: "sourceChannel",

  solAmount: "solAmount",
  entryPrice: "entryPrice",

  tpStage: "tpStage",
  highestPrice: "highestPrice",

  buyTxid: "buyTxid",
  openedAt: "openedAt",

  status: "status", // open | closing | closed
};