import express from "express";
import Trade from "../../models/Trade.js"; // SAME model used in tradeRecordRoute.js

const router = express.Router();

/**
 * GET /api/trades/history/:walletAddress
 * Returns trade history for the dashboard.
 *
 * Wallet-only mode:
 * Trades are stored by walletAddress, so query that field.
 */
router.get("/history/:walletAddress", async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress || "").trim();

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }

    const trades = await Trade.find({ walletAddress })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ ok: true, trades });
  } catch (err) {
    console.error("tradeHistory error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;