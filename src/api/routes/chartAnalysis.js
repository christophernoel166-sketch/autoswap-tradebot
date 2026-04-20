import express from "express";
import User from "../../models/User.js";
import { analyzeChartEntry } from "../../services/chartEntryService.js";

const router = express.Router();

// =====================================================
// PAID CHART ANALYSIS ROUTE
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

    // ===================================================
    // 💰 CHART ANALYSIS FEE (TO BE IMPLEMENTED NEXT)
    // ===================================================
    const chartAnalysisFeeSol = 0.001;

    const feeStatus = {
      charged: false,
      amountSol: chartAnalysisFeeSol,
      note: "Fee logic not wired yet",
    };

    // 🔥 Run analysis
    const chartEntry = await analyzeChartEntry(cleanTokenMint);

    return res.status(200).json({
      ok: true,
      walletAddress: cleanWalletAddress,
      tokenMint: cleanTokenMint,
      chartAnalysisFee: feeStatus,
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