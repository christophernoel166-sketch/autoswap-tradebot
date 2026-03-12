import express from "express";
import { redis } from "../utils/redis.js";
import {
  walletActiveSet,
} from "../redis/positionKeys.js";
import { manualSellCommandKey } from "../redis/commandKeys.js";

const router = express.Router();

/**
 * ===================================================
 * 🔥 MANUAL SELL (API → BOT BRIDGE)
 * POST /api/manual-sell
 * ===================================================
 */
router.post("/manual-sell", async (req, res) => {
  try {
    const { walletAddress, mint } = req.body;

    if (!walletAddress || !mint) {
      return res.status(400).json({
        error: "walletAddress and mint required",
      });
    }

    // 1️⃣ Validate position exists in Redis
    const walletKey = walletActiveSet(walletAddress);
    const isActive = await redis.sismember(walletKey, mint);

    if (!isActive) {
      return res.status(404).json({
        error: "position_not_found",
      });
    }

    // 2️⃣ Publish manual sell command
    const payload = {
      walletAddress,
      mint,
      requestedAt: Date.now(),
      source: "dashboard",
    };

    await redis.publish(
      manualSellCommandKey(),
      JSON.stringify(payload)
    );

    return res.json({
      ok: true,
      message: "manual sell dispatched",
    });
  } catch (err) {
    console.error("manual-sell error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * 🔥 MANUAL SELL ALL (API → BOT BRIDGE)
 * POST /api/manual-sell-all
 * ===================================================
 */
router.post("/manual-sell-all", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        error: "walletAddress required",
      });
    }

    // 1️⃣ Get all active positions for wallet
    const walletKey = walletActiveSet(walletAddress);
    const mints = await redis.smembers(walletKey);

    if (!mints || mints.length === 0) {
      return res.status(404).json({
        error: "no_active_positions",
      });
    }

    // 2️⃣ Publish one sell command per mint
    let dispatched = 0;

    for (const mint of mints) {
      const payload = {
        walletAddress,
        mint,
        requestedAt: Date.now(),
        source: "dashboard_sell_all",
      };

      await redis.publish(
        manualSellCommandKey(),
        JSON.stringify(payload)
      );

      dispatched++;
    }

    return res.json({
      ok: true,
      message: "manual sell all dispatched",
      walletAddress,
      count: dispatched,
      mints,
    });
  } catch (err) {
    console.error("manual-sell-all error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;