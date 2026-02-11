// src/redis/positionKeys.js

/**
 * ===================================================
 * Redis key helpers for ACTIVE POSITIONS
 * Shared by BOT + API
 * ===================================================
 */

/**
 * Set of active token mints for a wallet
 * Used to list active positions fast
 */
export function walletActiveSet(walletAddress) {
  return `active:wallet:${walletAddress}`;
}

/**
 * Alias for compatibility with bot / API naming
 * (DO NOT REMOVE — used by autoTrade-telegram.js)
 */
export function walletPositionsKey(walletAddress) {
  return walletActiveSet(walletAddress);
}

/**
 * Hash key for a specific position
 */
export function positionKey(walletAddress, mint) {
  return `position:${walletAddress}:${mint}`;
}

/**
 * Standard position hash fields
 * (documented, not enforced by Redis)
 */
export const POSITION_FIELDS = {
  walletAddress: "walletAddress",
  mint: "mint",
  sourceChannel: "sourceChannel",

  // trade info
  solAmount: "solAmount",
  entryPrice: "entryPrice",
  buyTxid: "buyTxid",

  // TP / SL state
  tpStage: "tpStage",
  highestPrice: "highestPrice",

  // 🔒 Lifecycle state (prevents double sell)
  // open → closing → closed
  status: "status",

  // timestamps
  openedAt: "openedAt",
};
