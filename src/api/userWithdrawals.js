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
router.get("/user/withdrawals", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: "wallet_missing",
      });
    }

    const withdrawals = await Withdrawal.find({
      walletAddress,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      walletAddress,
      count: withdrawals.length,
      withdrawals: withdrawals.map((w) => ({
        withdrawalId: w._id,
        amountSol: w.amountSol,
        feeSol: w.feeSol || 0,
        netAmountSol:
          w.amountSol && w.feeSol
            ? Number(w.amountSol - w.feeSol)
            : w.amountSol,
        status: w.status,
        txSignature: w.txSignature || null,
        error: w.error || null,
        createdAt: w.createdAt,
        sentAt: w.sentAt || null,
        failedAt: w.failedAt || null,
      })),
    });
  } catch (err) {
    console.error("❌ withdrawal history error:", err);
    return res.status(500).json({
      error: "internal_error",
    });
  }
});

export default router;
