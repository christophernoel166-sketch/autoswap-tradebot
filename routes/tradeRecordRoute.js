// routes/tradeRecordRoute.js

import express from "express";
import Trade from "../models/Trade.js";

const router = express.Router();

/**
 * POST /api/trades/record
 *
 * Records a completed trade using actual execution results
 * whenever those values are available.
 *
 * Supported body:
 *  walletAddress
 *  tgId
 *  tradeType
 *  tokenMint
 *  amountSol
 *  amountToken
 *  solReceived
 *  entryPrice
 *  exitPrice
 *  pnlPercent
 *  takeProfit
 *  stopLoss
 *  buyTxid
 *  sellTxid
 *  status
 *  source
 *  params
 *  state
 *  createdAt
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    // =====================================================
    // IDENTITY
    // =====================================================

    const walletAddress = String(
      body.walletAddress || ""
    ).trim();

    const tgId = String(
      body.tgId ||
      walletAddress ||
      "unknown"
    ).trim();

    const tradeType =
      body.tradeType || "auto";

    // =====================================================
    // REQUIRED TOKEN
    // =====================================================

    const tokenMint =
      body.tokenMint;

    if (!tokenMint) {
      return res.status(400).json({
        error: "tokenMint is required",
      });
    }

    // =====================================================
    // NUMERIC INPUTS
    // =====================================================

    const amountSol =
      Number(body.amountSol ?? 0) || 0;

    const amountToken =
      Number(body.amountToken ?? 0) || 0;

    const solReceived =
      Number(body.solReceived ?? 0) || 0;

    const entryPrice =
      Number(body.entryPrice ?? 0) || 0;

    const exitPrice =
      Number(body.exitPrice ?? 0) || 0;

    // =====================================================
    // REALIZED PNL
    //
    // Actual SOL accounting is authoritative.
    //
    // pnlSol = actual SOL received - actual SOL spent
    // =====================================================

    let pnlSol = 0;

    if (
      Number.isFinite(amountSol) &&
      Number.isFinite(solReceived)
    ) {
      pnlSol =
        solReceived - amountSol;
    }

    // =====================================================
    // PNL PERCENT
    //
    // Prefer authoritative pnlPercent supplied by
    // autoTrade-telegram.js.
    //
    // If it isn't supplied, derive it from actual SOL
    // execution amounts.
    //
    // Price-based calculation is only a final legacy
    // fallback.
    // =====================================================

    let pnlPercent = null;

    if (
      Number.isFinite(Number(body.pnlPercent))
    ) {
      pnlPercent =
        Number(body.pnlPercent);
    } else if (
      amountSol > 0 &&
      Number.isFinite(solReceived)
    ) {
      pnlPercent =
        ((solReceived - amountSol) /
          amountSol) *
        100;
    } else if (
      entryPrice > 0 &&
      exitPrice > 0
    ) {
      // Legacy fallback for older callers
      // that don't provide execution amounts.
      pnlPercent =
        ((exitPrice - entryPrice) /
          entryPrice) *
        100;
    }

    // =====================================================
    // CREATE TRADE
    // =====================================================

    const trade = await Trade.create({
      // Identity
      tgId,
      walletAddress,

      // Trade metadata
      tradeType,
      tokenMint,

      // Execution amounts
      amountSol,
      amountToken,
      solReceived,

      // Prices
      entryPrice,
      exitPrice,

      // Realized PnL
      pnlSol,
      pnlPercent,

      // Risk parameters
      takeProfit:
        Number(body.takeProfit ?? 0) || 0,

      stopLoss:
        Number(body.stopLoss ?? 0) || 0,

      // Transactions
      buyTxid:
        body.buyTxid || null,

      sellTxid:
        body.sellTxid || null,

      // State
      status:
        body.status || "closed",

      source:
        body.source || "telegram",

      params:
        body.params || {},

      state:
        body.state || {},

      createdAt:
        body.createdAt
          ? new Date(body.createdAt)
          : new Date(),
    });

    // =====================================================
    // LOG AUTHORITATIVE ACCOUNTING
    // =====================================================

    console.log(
      "✅ Trade recorded with execution-based PnL",
      {
        tradeId: trade._id,
        walletAddress,
        tokenMint,

        amountSol,
        solReceived,

        pnlSol,
        pnlPercent,

        entryPrice,
        exitPrice,

        buyTxid:
          body.buyTxid || null,

        sellTxid:
          body.sellTxid || null,
      }
    );

    return res.json({
      ok: true,
      trade,
    });
  } catch (err) {
    console.error(
      "tradeRecordRoute error:",
      err
    );

    return res.status(500).json({
      error: err.message,
    });
  }
});

export default router;