import express from "express";
import User from "../../../models/User.js";
import { analyzeChartEntry } from "../../services/chartEntryService.js";
import { chargeServiceFee } from "../../withdraw/processWithdrawal.js";

const router = express.Router();

const CHART_ANALYSIS_FEE_SOL = 0.001;

// =====================================================
// PAID CHART ANALYSIS ROUTE
// POST /api/tokens/chart-analysis
// =====================================================
router.post("/chart-analysis", async (req, res) => {
  try {
    const { walletAddress, tokenMint } = req.body || {};

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({
        ok: false,
        error: "walletAddress is required",
      });
    }

    if (!tokenMint || typeof tokenMint !== "string") {
      return res.status(400).json({
        ok: false,
        error: "tokenMint is required",
      });
    }

    const cleanWalletAddress = walletAddress.trim();
    const cleanTokenMint = tokenMint.trim();

    const user = await User.findOne({ walletAddress: cleanWalletAddress });
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "user_not_found",
      });
    }

    if (!user.tradingWalletEncryptedPrivateKey || !user.tradingWalletIv) {
      return res.status(400).json({
        ok: false,
        error: "trading_wallet_missing",
      });
    }

    // ===================================================
    // Charge premium chart-analysis fee
    // ===================================================
    const feeResult = await chargeServiceFee({
      user,
      amountSol: CHART_ANALYSIS_FEE_SOL,
      type: "chart_analysis_fee",
      tokenMint: cleanTokenMint,
    });

    // ===================================================
    // Run chart analysis after successful fee charge
    // ===================================================
    const chartEntry = await analyzeChartEntry(cleanTokenMint);

console.log("🔥 chartEntry result:", JSON.stringify(chartEntry, null, 2));

    return res.status(200).json({
      ok: true,
      walletAddress: cleanWalletAddress,
      tokenMint: cleanTokenMint,
      chartAnalysisFee: {
        charged: true,
        amountSol: CHART_ANALYSIS_FEE_SOL,
        txSignature: feeResult.txSignature,
      },
      chartEntry,
      analyzedAt: new Date(),
    });
  } catch (error) {
    console.error("POST /api/tokens/chart-analysis error:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to run chart analysis",
      details: error?.message || String(error),
    });
  }
});

export default router;