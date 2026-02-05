// src/admin/getFeeHistory.js
import Withdrawal from "../../models/Withdrawal.js";

export async function getFeeHistory({ limit = 50 } = {}) {
  const rows = await Withdrawal.find({
    feeSol: { $gt: 0 },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((w) => ({
    walletAddress: w.walletAddress,
    feeSol: w.feeSol,
    status: w.status,
    feeWithdrawn: w.feeWithdrawn || false,
    txSignature: w.txSignature || null,
    createdAt: w.createdAt,
    sentAt: w.sentAt || null,
  }));
}
