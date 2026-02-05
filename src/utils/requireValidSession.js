// src/utils/requireValidSession.js
import SessionAuthorization from "../../models/SessionAuthorization.js";

/**
 * Enforce valid trading session before executing a trade
 * Returns the active session if valid
 * Throws if invalid
 */
export async function requireValidSession({ walletAddress, solAmount }) {
  if (!walletAddress) {
    throw new Error("Wallet address missing");
  }

  const session = await SessionAuthorization.findOne({
    walletAddress,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!session) {
    throw new Error("No active trading session");
  }

  if (Number(solAmount) > Number(session.solPerTrade)) {
    throw new Error(
      `Trade amount ${solAmount} exceeds authorized limit ${session.solPerTrade}`
    );
  }

  return session; // 🔥 IMPORTANT: return session, not true
}
