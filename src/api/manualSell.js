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
 * Supports partial sells: 25, 50, 75, 100
 * ===================================================
 */
router.post("/manual-sell", async (req, res) => {
  try {
    const { walletAddress, mint, percent = 100 } = req.body || {};

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({
        ok: false,
        error: "walletAddress required",
      });
    }

    if (!mint || typeof mint !== "string") {
      return res.status(400).json({
        ok: false,
        error: "mint required",
      });
    }

    const cleanWalletAddress = walletAddress.trim();
    const cleanMint = mint.trim();
    const sellPercent = Number(percent);

    if (![25, 50, 75, 100].includes(sellPercent)) {
      return res.status(400).json({
        ok: false,
        error: "percent must be one of 25, 50, 75, 100",
      });
    }

    // 1️⃣ Validate position exists in Redis
    const walletKey = walletActiveSet(cleanWalletAddress);
    const isActive = await redis.sismember(walletKey, cleanMint);

    if (!isActive) {
      return res.status(404).json({
        ok: false,
        error: "position_not_found",
      });
    }

    // 2️⃣ Publish manual sell command
    const payload = {
      walletAddress: cleanWalletAddress,
      mint: cleanMint,
      percent: sellPercent,
      requestedAt: Date.now(),
      source: "dashboard",
    };

    await redis.publish(
      manualSellCommandKey(),
      JSON.stringify(payload)
    );

    return res.json({
      ok: true,
      message:
        sellPercent === 100
          ? "manual sell all dispatched"
          : `manual sell ${sellPercent}% dispatched`,
      walletAddress: cleanWalletAddress,
      mint: cleanMint,
      percent: sellPercent,
    });
  } catch (err) {
    console.error("manual-sell error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
    });
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
    const { walletAddress } = req.body || {};

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({
        ok: false,
        error: "walletAddress required",
      });
    }

    const cleanWalletAddress = walletAddress.trim();

    // 1️⃣ Get all active positions for wallet
    const walletKey = walletActiveSet(cleanWalletAddress);
    const mints = await redis.smembers(walletKey);

    if (!mints || mints.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "no_active_positions",
      });
    }

    // 2️⃣ Publish one sell-all command per mint
    let dispatched = 0;

    for (const mint of mints) {
      const payload = {
        walletAddress: cleanWalletAddress,
        mint,
        percent: 100,
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
      walletAddress: cleanWalletAddress,
      count: dispatched,
      mints,
    });
  } catch (err) {
    console.error("manual-sell-all error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;