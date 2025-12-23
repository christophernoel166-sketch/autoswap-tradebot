import express from "express";
import User from "../../models/User.js";

// Get price helper from solanaUtils
import { getCurrentPrice } from "../../solanaUtils.js";

// Import bot engine (monitor + safeSellAll)
import botEngine from "../../autoTrade-telegram.js";
const { monitored, safeSellAll } = botEngine;
import saveTelegramTradeToBackend from "../../utils/saveTrade.js";


const router = express.Router();

/**
 * POST /api/manual-sell
 */
router.post("/", async (req, res) => {
  try {
    const { walletAddress, mint } = req.body;

    if (!walletAddress || !mint)
      return res.status(400).json({ error: "walletAddress & mint required" });

    const user = await User.findOne({ walletAddress });
    if (!user)
      return res.status(404).json({ error: "user_not_found" });

    const state = monitored.get(mint);
    const info = state?.users?.get(walletAddress);

    let entryPrice = info?.entryPrice || null;

    let sellRes;
    try {
      sellRes = await safeSellAll(walletAddress, mint, walletAddress);
    } catch (err) {
      console.error("manual sell error:", err);
      return res.status(500).json({ error: "sell_failed" });
    }

    const sellTxid =
      sellRes?.txid ||
      sellRes?.signature ||
      sellRes?.sig ||
      sellRes ||
      null;

    let exitPrice = 0;
    try {
      exitPrice = await getCurrentPrice(mint);
    } catch {}

    await saveTelegramTradeToBackend({
      telegramId: walletAddress,
      mint,
      solAmount: user.solPerTrade || 0.01,
      entryPrice,
      exitPrice,
      buyTxid: null,
      sellTxid,
      sourceChannel: "manual_web",
      reason: "manual_sell",
    });

    if (state) {
      state.users.delete(walletAddress);
      state.entryPrices.delete(walletAddress);
    }

    return res.json({
      ok: true,
      tx: sellTxid,
      exitPrice,
    });
  } catch (err) {
    console.error("manual sell error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
