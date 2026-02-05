// src/api/walletHistory.js
import express from "express";
import Deposit from "../../models/Deposit.js";
import Withdrawal from "../../models/Withdrawal.js";

const router = express.Router();

/**
 * GET /api/wallet/history?walletAddress=...
 */
router.get("/history", async (req, res) => {
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) {
      return res.json({ records: [] });
    }

    const deposits = await Deposit.find({
      creditedWallet: walletAddress,
    }).lean();

    const withdrawals = await Withdrawal.find({
      walletAddress,
    }).lean();

    const records = [
      ...deposits.map(d => ({
        type: "deposit",
        amountSol: d.amountSol,
        status: d.status || "confirmed",
        createdAt: d.blockTime || d.createdAt,
      })),
      ...withdrawals.map(w => ({
        type: "withdraw",
        amountSol: w.amountSol,
        status: w.status,
        createdAt: w.createdAt,
      })),
    ];

    records.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({ records });
  } catch (err) {
    console.error("wallet history error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
