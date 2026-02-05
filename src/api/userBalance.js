// src/api/userBalance.js
import express from "express";
import User from "../../models/User.js";

const router = express.Router();

/**
 * ===================================================
 * 👤 USER — BALANCE SUMMARY (DASHBOARD)
 * GET /api/user/balance?walletAddress=...
 * ===================================================
 */
router.get("/user/balance", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: "wallet_missing",
      });
    }

    const user = await User.findOne({ walletAddress }).lean();

    if (!user) {
      return res.status(404).json({
        error: "user_not_found",
      });
    }

    const balanceSol = Number(user.balanceSol || 0);
    const lockedBalanceSol = Number(user.lockedBalanceSol || 0);
    const availableSol = balanceSol; // withdrawable
    const totalSol = balanceSol + lockedBalanceSol;

    return res.json({
      walletAddress,
      balanceSol,
      lockedBalanceSol,
      availableSol,
      totalSol,
      tradingEnabled: Boolean(user.tradingEnabled),
    });
  } catch (err) {
    console.error("❌ balance endpoint error:", err);
    return res.status(500).json({
      error: "internal_error",
    });
  }
});

export default router;
