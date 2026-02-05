import SessionAuthorization from "../../models/SessionAuthorization.js";


/**
 * Enforces valid trading session before executing trades
 */
export async function requireValidSession({
  walletAddress,
  solAmount,
}) {
  const now = new Date();

  const session = await SessionAuthorization.findOne({
    walletAddress,
    revoked: false,
    expiresAt: { $gt: now },
  }).lean();

  if (!session) {
    throw new Error("NO_ACTIVE_SESSION");
  }

  if (solAmount > session.solPerTrade) {
    throw new Error("SOL_AMOUNT_EXCEEDS_AUTHORIZATION");
  }

  return session; // contains sessionPubkey, expiry, limits
}
