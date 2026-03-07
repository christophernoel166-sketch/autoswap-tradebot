import express from "express";
import { redis } from "../utils/redis.js";
import {
  walletActiveSet,
  positionKey,
} from "../redis/positionKeys.js";
import { getCurrentPrice } from "../../solanaUtils.js";

const router = express.Router();

/**
 * ===================================================
 * 📊 ACTIVE POSITIONS (READ-ONLY, REDIS-BACKED)
 * GET /api/active-positions/:walletAddress
 * ===================================================
 */
router.get("/:walletAddress", async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress || "").trim();

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
      if (data.status && data.status !== "open") continue;

      const solAmount = Number(data.solAmount || 0);
      const entryPrice = Number(data.entryPrice || 0);
      const tpStage = Number(data.tpStage || 0);
      const highestPrice = Number(data.highestPrice || 0);
      const openedAt = Number(data.openedAt || 0);

      let currentPrice = 0;
      let changePercent = 0;
      let pnlSol = 0;

      try {
        currentPrice = Number(await getCurrentPrice(mint)) || 0;
      } catch (err) {
        console.warn("active-positions current price fetch failed:", {
          walletAddress,
          mint,
          err: err?.message,
        });
      }

      if (entryPrice > 0 && currentPrice > 0) {
        changePercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        pnlSol = ((currentPrice - entryPrice) / entryPrice) * solAmount;
      }

      positions.push({
        walletAddress: data.walletAddress || walletAddress,
        mint: data.mint || mint,
        sourceChannel: data.sourceChannel || null,

        solAmount,
        entryPrice,
        currentPrice,
        changePercent,
        pnlSol,

        buyTxid: data.buyTxid || null,
        tpStage,
        highestPrice,
        openedAt,
      });
    }

    return res.json({ positions });
  } catch (err) {
    console.error("active-positions error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;