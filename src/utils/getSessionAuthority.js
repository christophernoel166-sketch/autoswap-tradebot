// src/utils/getSessionAuthority.js
import SessionAuthorization from "../../models/SessionAuthorization.js";

export async function getSessionAuthority({ walletAddress, solAmount }) {
  const session = await SessionAuthorization.findOne({
    walletAddress,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!session) {
    throw new Error("No active session");
  }

  if (solAmount > session.solPerTrade) {
    throw new Error("Trade exceeds authorized SOL amount");
  }

  return {
    sessionPubkey: session.sessionPubkey,
    sessionId: session._id,
    expiresAt: session.expiresAt,
  };
}
