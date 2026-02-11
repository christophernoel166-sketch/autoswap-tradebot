import express from "express";
import { redis } from "../utils/redis.js";
import {
  walletActiveSet,
  positionKey,
} from "../redis/positionKeys.js";

const router = express.Router();

/**
 * ===================================================
 * 📊 ACTIVE POSITIONS (READ-ONLY, REDIS-BACKED)
 * GET /api/active-positions/:walletAddress
 * ===================================================
 */
router.get("/active-positions/:walletAddress", async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress);

    if (!walletAddress) {
      return res.status(400).json({ error: "wallet_required" });
    }

    // 1️⃣ Get all active mints for this wallet
    const walletKey = walletActiveSet(walletAddress);
    const mints = await redis.smembers(walletKey);

    if (!mints.length) {
      return res.json({ positions: [] });
    }

    const positions = [];

    // 2️⃣ Fetch each position hash
    for (const mint of mints) {
      const posKey = positionKey(walletAddress, mint);
      const data = await redis.hgetall(posKey);

      if (!data || Object.keys(data).length === 0) continue;

      positions.push({
        walletAddress: data.walletAddress,
        mint: data.mint,
        sourceChannel: data.sourceChannel,

        solAmount: Number(data.solAmount || 0),
        entryPrice: Number(data.entryPrice || 0),
        buyTxid: data.buyTxid || null,

        tpStage: Number(data.tpStage || 0),
        highestPrice: Number(data.highestPrice || 0),

        openedAt: Number(data.openedAt || 0),
      });
    }

    return res.json({ positions });
  } catch (err) {
    console.error("active-positions error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
