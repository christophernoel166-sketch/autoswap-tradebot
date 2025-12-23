import express from "express";
import Trade from "../../models/Trade.js";   // SAME model used in tradeRecordRoute.js

const router = express.Router();

/**
 * GET /api/trades/history/:walletAddress
 * Returns trade history for the dashboard.
 *
 * IMPORTANT:
 * Your trade records store tgId, NOT walletAddress.
 * Now that you use wallet-only mode,
 * we treat walletAddress AS tgId (identity = wallet).
 */
router.get("/history/:walletAddress", async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress);

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }

    // Fetch all trades where tgId === walletAddress
    const trades = await Trade.find({ tgId: walletAddress })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ ok: true, trades });
  } catch (err) {
    console.error("tradeHistory error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
