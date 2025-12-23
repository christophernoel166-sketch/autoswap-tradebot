import express from "express";
import Trade from "../../models/Trade.js";

const router = express.Router();

/**
 * GET /api/stats
 */
router.get("/", async (req, res) => {
  try {
    const trades = await Trade.find({}, { tgId: 1, amountSol: 1 }).lean();

    const totalTrades = trades.length;

    const totalUsers = new Set(
      trades.filter(t => t.tgId).map(t => String(t.tgId))
    ).size;

    const totalVolume = trades.reduce(
      (sum, t) => sum + (Number(t.amountSol) || 0),
      0
    );

    res.json({
      ok: true,
      stats: {
        totalUsers,
        totalTrades,
        totalVolume: Number(totalVolume.toFixed(6)),
      },
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats/recent
 */
router.get("/recent", async (req, res) => {
  try {
    const recents = await Trade.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ ok: true, trades: recents });
  } catch (err) {
    console.error("Recent stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
