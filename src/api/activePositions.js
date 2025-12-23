import express from "express";
import User from "../../models/User.js";

// FIX — import from correct bot engine file
import botEngine from "../../autoTrade-telegram.js";
const { monitored } = botEngine;

const router = express.Router();

/**
 * GET /api/active-positions/wallet/:wallet
 */
router.get("/wallet/:wallet", async (req, res) => {
  try {
    const wallet = String(req.params.wallet);

    const user = await User.findOne({ walletAddress: wallet });
    if (!user) return res.json({ positions: [] });

    const positions = [];

    for (const [mint, state] of monitored.entries()) {
      const info = state.users.get(wallet);
      if (!info) continue;

      const entry = info.entryPrice || 0;
      const current = state.lastPrice || entry;
      const diffPct =
        entry > 0 ? (((current - entry) / entry) * 100).toFixed(2) : "0";

      const solPerTrade = info.solAmount || user.solPerTrade || 0.01;

      positions.push({
        mint,
        entryPrice: entry,
        currentPrice: current,
        changePercent: diffPct,
        pnlSol: ((current - entry) * solPerTrade).toFixed(6),
        tpStage: info.tpStage,
        wallet,
      });
    }

    return res.json({ positions });
  } catch (err) {
    console.error("active-positions error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
