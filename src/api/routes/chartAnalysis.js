import express from "express";
import User from "../../../models/User.js";

import {
  analyzeChartEntry,
} from "../../services/chartEntryService.js";

import {
  createChartWatch,
} from "../../services/chartWatchService.js";

import {
  chargeServiceFee,
} from "../../withdraw/processWithdrawal.js";

const router = express.Router();

const CHART_ANALYSIS_FEE_SOL =
  Number(
    process.env.CHART_ANALYSIS_FEE_SOL || 0.001
  );

// =====================================================
// PAID CHART ANALYSIS ROUTE
// POST /api/tokens/chart-analysis
// =====================================================

router.post(
  "/chart-analysis",
  async (req, res) => {

    try {

      const {
        walletAddress,
        tokenMint,
        pairAddress,
      } = req.body || {};

      // =================================================
      // VALIDATE WALLET
      // =================================================

      if (
        !walletAddress ||
        typeof walletAddress !== "string"
      ) {

        return res.status(400).json({
          ok: false,
          error: "walletAddress is required",
        });

      }

      // =================================================
      // VALIDATE TOKEN
      // =================================================

      if (
        !tokenMint ||
        typeof tokenMint !== "string"
      ) {

        return res.status(400).json({
          ok: false,
          error: "tokenMint is required",
        });

      }

      const cleanWalletAddress =
        walletAddress.trim();

      const cleanTokenMint =
        tokenMint.trim();

      // =================================================
      // FIND USER
      // =================================================

      const user =
        await User.findOne({
          walletAddress:
            cleanWalletAddress,
        });

      if (!user) {

        return res.status(404).json({
          ok: false,
          error: "user_not_found",
        });

      }

      // =================================================
      // REQUIRE TRADING WALLET
      // =================================================

      if (
        !user.tradingWalletEncryptedPrivateKey ||
        !user.tradingWalletIv
      ) {

        return res.status(400).json({
          ok: false,
          error: "trading_wallet_missing",
        });

      }

      // =================================================
      // REQUIRE LIQUIDITY / PAIR
      // =================================================

      if (!pairAddress) {

        return res.status(400).json({
          ok: false,
          error: "no_liquidity",
          message:
            "Chart analysis is not available for tokens without liquidity",
        });

      }

      // =================================================
      // 1. RUN CHART ANALYSIS
      //
      // IMPORTANT:
      // Do this before charging the user.
      // =================================================

      const chartEntry =
        await analyzeChartEntry(
          cleanTokenMint
        );

      console.log(
        "🔥 chartEntry result:",
        JSON.stringify(
          chartEntry,
          null,
          2
        )
      );

      // =================================================
      // 2. ANALYSIS FAILED
      //
      // DO NOT CHARGE
      // =================================================

      if (
        !chartEntry?.ok
      ) {

        return res.status(400).json({
          ok: false,
          error:
            "chart_data_unavailable",
          details:
            chartEntry?.warnings?.[0] ||
            "Chart analysis unavailable",
        });

      }

      // =================================================
      // DETERMINE WHETHER THIS ANALYSIS SHOULD BECOME
      // A LIVE CHART WATCH
      // =================================================

      const shouldMonitor =
        chartEntry.action ===
          "wait_breakout" ||
        chartEntry.action ===
          "wait_pullback";

      // =================================================
      // MAP CHART SETUP → CHART WATCH SETUP
      // =================================================

      let setupType = null;

      if (
        chartEntry.action ===
        "wait_breakout"
      ) {

        setupType =
          "BREAKOUT_SETUP";

      } else if (
        chartEntry.action ===
        "wait_pullback"
      ) {

        setupType =
          "PULLBACK_SETUP";

      }

      // =================================================
      // 3. CHARGE CHART ANALYSIS FEE
      // =================================================

      const feeResult =
        await chargeServiceFee({
          user,
          amountSol:
            CHART_ANALYSIS_FEE_SOL,
          type:
            "chart_analysis_fee",
          tokenMint:
            cleanTokenMint,
        });

      // =================================================
      // 4. CREATE LIVE CHART WATCH
      //
      // Only WAIT_BREAKOUT and WAIT_PULLBACK
      // become active watches.
      //
      // AVOID does not become a watch.
      // ENTER_NOW does not need a waiting watch.
      // =================================================

      let watch = null;

      if (
        shouldMonitor &&
        setupType
      ) {

        watch =
          await createChartWatch({
            walletAddress:
              cleanWalletAddress,

            token: {
              mintAddress:
                cleanTokenMint,

              pairAddress:
                pairAddress || null,

              symbol:
                req.body?.symbol ||
                null,

              name:
                req.body?.name ||
                null,

              priceUsd:
                chartEntry
                  ?.metrics
                  ?.currentPrice ??
                null,
            },

            chartEntry,

            forecast:
              req.body?.forecast ||
              null,

            autoTrade:
              Boolean(
                req.body?.autoTrade
              ),
          });

        console.log(
          "👁️ LIVE CHART WATCH CREATED:",
          {
            watchId:
              watch?._id?.toString?.() ||
              watch?._id,

            walletAddress:
              cleanWalletAddress,

            mintAddress:
              cleanTokenMint,

            action:
              chartEntry.action,

            setupType,
          }
        );

      } else {

        console.log(
          "ℹ️ Chart analysis does not require an active watch:",
          {
            action:
              chartEntry.action,

            setupType:
              chartEntry.setupType,
          }
        );

      }

      // =================================================
      // 5. RETURN RESULT
      // =================================================

      return res.status(200).json({

        ok: true,

        walletAddress:
          cleanWalletAddress,

        tokenMint:
          cleanTokenMint,

        chartAnalysisFee: {

          charged: true,

          amountSol:
            CHART_ANALYSIS_FEE_SOL,

          txSignature:
            feeResult.txSignature,

        },

        // ===============================================
        // CHART ANALYSIS
        // ===============================================

        chartEntry,

        // ===============================================
        // LIVE MONITORING
        // ===============================================

        monitoring: {

          active:
            Boolean(watch),

          watchId:
            watch?._id?.toString?.() ||
            null,

          setupType:
            setupType,

          action:
            chartEntry.action,

          message:
            watch
              ? "Chart analysis is now being monitored live."
              : "No live chart watch was created for the current chart state.",

        },

        // ===============================================
        // TIMESTAMP
        // ===============================================

        analyzedAt:
          new Date(),

      });

    } catch (error) {

      console.error(
        "POST /api/tokens/chart-analysis error:",
        error
      );

      // =================================================
      // INSUFFICIENT BALANCE
      // =================================================

      if (
        error?.message
          ?.toLowerCase()
          ?.includes(
            "insufficient"
          ) ||
        error?.message
          ?.toLowerCase()
          ?.includes(
            "balance"
          )
      ) {

        return res.status(400).json({
          ok: false,
          error:
            "insufficient_balance",
          message:
            "You do not have enough SOL to run chart analysis",
        });

      }

      // =================================================
      // GENERAL ERROR
      // =================================================

      return res.status(500).json({
        ok: false,
        error:
          "Failed to run chart analysis",
        details:
          error?.message ||
          String(error),
      });

    }

  }
);

export default router;