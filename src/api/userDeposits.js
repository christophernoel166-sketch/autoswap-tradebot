// src/api/userDeposits.js
import express from "express";
import Deposit from "../../models/Deposit.js";

const router = express.Router();

/**
 * ===================================================
 * 👤 USER — DEPOSIT HISTORY (DASHBOARD)
 * GET /api/user/deposits?walletAddress=...
 * ===================================================
 */
router.get("/user/deposits", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: "wallet_missing",
      });
    }

    const deposits = await Deposit.find({
      creditedWallet: walletAddress,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      walletAddress,
      count: deposits.length,
      deposits: deposits.map((d) => ({
        txSignature: d.txSignature,
        amountSol: d.amountSol,
        status: d.status,
        memo: d.memo || null,
        blockTime: d.blockTime,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    console.error("❌ deposit history error:", err);
    return res.status(500).json({
      error: "internal_error",
    });
  }
});

export default router;
