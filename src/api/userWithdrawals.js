// src/api/userWithdrawals.js
import express from "express";
import Withdrawal from "../../models/Withdrawal.js";

const router = express.Router();

/**
 * ===================================================
 * 👤 USER — WITHDRAWAL HISTORY (DASHBOARD)
 * GET /api/user/withdrawals?walletAddress=...
 * ===================================================
 */
router.get("/", async (req, res) => {
  try {
    const walletAddress = String(req.query.walletAddress || "").trim();

    if (!walletAddress) {
      return res.status(400).json({ error: "wallet_missing" });
    }

    const withdrawals = await Withdrawal.find({ walletAddress })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      walletAddress,
      count: withdrawals.length,
      withdrawals: withdrawals.map((w) => {
        const amountSol = Number(w.amountSol || 0);
        const feeSol = Number(w.feeSol || 0);

        // ✅ Prefer stored netAmountSol if present (most accurate)
        const netAmountSol =
          Number.isFinite(Number(w.netAmountSol)) && Number(w.netAmountSol) > 0
            ? Number(w.netAmountSol)
            : Math.max(0, Number((amountSol - feeSol).toFixed(6)));

        return {
          withdrawalId: String(w._id),
          amountSol,
          feeSol,
          netAmountSol,
          status: w.status,
          txSignature: w.txSignature || null,

          // These require schema support (recommended)
          error: w.error || null,
          createdAt: w.createdAt || null,
          sentAt: w.sentAt || null,
          failedAt: w.failedAt || null,
        };
      }),
    });
  } catch (err) {
    console.error("❌ withdrawal history error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;