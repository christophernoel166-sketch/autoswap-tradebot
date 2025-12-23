// routes/tradeRecordRoute.js
import express from "express";
import Trade from "../models/Trade.js";

const router = express.Router();

/**
 * POST /api/trades/record
 * Body:
 *  tgId, tradeType, tokenMint,
 *  amountSol, amountToken,
 *  entryPrice, exitPrice,
 *  buyTxid, sellTxid,
 *  status, source, params, state
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const tgId = body.tgId ? String(body.tgId) : "unknown";
    const tradeType = body.tradeType || "auto";
    const tokenMint = body.tokenMint;
    if (!tokenMint) {
      return res.status(400).json({ error: "tokenMint is required" });
    }

    const amountSol = Number(body.amountSol ?? 0) || 0;
    const amountToken = Number(body.amountToken ?? 0) || 0;
    const entryPrice = Number(body.entryPrice ?? 0) || 0;
    const exitPrice = Number(body.exitPrice ?? 0) || 0;

    // approximate PnL: amountSol * ((exitEntryRatio) - 1)
    // If we don't have exitPrice yet (e.g. open trade), PnL is 0
    let pnlSol = 0;
    if (entryPrice > 0 && exitPrice > 0 && amountSol !== 0) {
      const change = (exitPrice - entryPrice) / entryPrice; // % change
      pnlSol = amountSol * change;
    }

    const trade = await Trade.create({
      tgId,
      tradeType,
      tokenMint,
      amountSol,
      amountToken,
      entryPrice,
      exitPrice,
      pnlSol,
      takeProfit: Number(body.takeProfit ?? 0) || 0,
      stopLoss: Number(body.stopLoss ?? 0) || 0,
      buyTxid: body.buyTxid || null,
      sellTxid: body.sellTxid || null,
      status: body.status || "closed",
      source: body.source || "telegram",
      params: body.params || {},
      state: body.state || {},
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
    });

    res.json({ ok: true, trade });
  } catch (err) {
    console.error("tradeRecordRoute error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
