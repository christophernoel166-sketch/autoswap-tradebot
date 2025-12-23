// src/api/analytics.js

import express from "express";
import Trade from "../../models/Trade.js";

const router = express.Router();

/**
 * TOTAL PNL PER USER
 * GET /api/analytics/user/:tgId/pnl
 */
router.get("/user/:tgId/pnl", async (req, res) => {
  try {
    const tgId = String(req.params.tgId);

    const trades = await Trade.find({ tgId }).lean();
    if (!trades.length)
      return res.json({ ok: true, pnl: 0, trades: [] });

    let pnl = 0;

    trades.forEach((t) => {
      const buy = Number(t.entryPrice || 0);
      const sell = Number(t.exitPrice || 0);
      pnl += sell - buy;
    });

    res.json({ ok: true, pnl, trades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * TOKEN ANALYTICS
 * GET /api/analytics/token/:mint
 */
router.get("/token/:mint", async (req, res) => {
  try {
    const mint = req.params.mint;

    const trades = await Trade.find({ tokenMint: mint }).lean();

    res.json({
      ok: true,
      mint,
      count: trades.length,
      trades
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * DAILY TRADE SUMMARY
 * GET /api/analytics/daily
 */
router.get("/daily", async (req, res) => {
  try {
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);

    const trades = await Trade.find({
      createdAt: { $gte: last7 }
    }).lean();

    const summary = {};

    trades.forEach(t => {
      const day = new Date(t.createdAt).toISOString().slice(0,10);
      if (!summary[day]) summary[day] = { count: 0, volume: 0 };

      summary[day].count += 1;
      summary[day].volume += Number(t.amountSol || 0);
    });

    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * WEEKLY PNL SUMMARY
 * GET /api/analytics/weekly-pnl
 */
router.get("/weekly-pnl", async (req, res) => {
  try {
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);

    const trades = await Trade.find({
      createdAt: { $gte: last30 }
    }).lean();

    const summary = {};

    trades.forEach(t => {
      const week = getWeek(t.createdAt);
      if (!summary[week]) summary[week] = { pnl: 0 };

      const buy = Number(t.entryPrice || 0);
      const sell = Number(t.exitPrice || 0);

      summary[week].pnl += sell - buy;
    });

    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getWeek(date) {
  const d = new Date(date);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `Week-${week}-${d.getFullYear()}`;
}

export default router;
