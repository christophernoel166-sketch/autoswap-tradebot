import express from "express";
import { redis } from "../utils/redis.js";
import { walletSnapshotKey } from "../redis/positionKeys.js";

const router = express.Router();

/**
 * ===================================================
 * 📊 ACTIVE POSITIONS (SNAPSHOT-BASED)
 * GET /api/active-positions/:walletAddress
 * ===================================================
 */
router.get("/:walletAddress", async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress || "").trim();

    if (!walletAddress) {
      return res.status(400).json({ error: "wallet_required" });
    }

    const key = walletSnapshotKey(walletAddress);
    const raw = await redis.get(key);

    if (!raw) {
      return res.json({ positions: [] });
    }

    let positions = [];
    try {
      const parsed = JSON.parse(raw);
      positions = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("active-positions snapshot parse error:", err);
      return res.json({ positions: [] });
    }

    const normalized = positions.map((p) => ({
      walletAddress,
      mint: p.mint || null,
      sourceChannel: p.sourceChannel || null,

      solAmount: Number(p.solAmount || 0),
      entryPrice: Number(p.entryPrice || 0),
      currentPrice: Number(p.currentPrice || 0),
      changePercent: Number(p.changePercent || 0),
      pnlSol: Number(p.pnlSol || 0),

      buyTxid: p.buyTxid || null,
      tpStage: Number(p.tpStage || 0),
      highestPrice: Number(p.highestPrice || 0),
      openedAt: Number(p.openedAt || 0),
    }));

    return res.json({ positions: normalized });
  } catch (err) {
    console.error("active-positions error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;