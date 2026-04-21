import express from "express";
import User from "../../../models/User.js";
import { analyzeChartEntry } from "../../services/chartEntryService.js";
import { chargeServiceFee } from "../../withdraw/processWithdrawal.js";

const router = express.Router();

const CHART_ANALYSIS_FEE_SOL = 0.0001;

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

if (!scanResult?.pairAddress) {
  return res.status(400).json({
    ok: false,
    error: "no_liquidity",
    message: "Chart analysis is not available for tokens without liquidity",
  });
}

    // ===================================================
    // 1️⃣ Run chart analysis FIRST (NO CHARGE YET)
    // ===================================================
    const chartEntry = await analyzeChartEntry(cleanTokenMint);

    console.log("🔥 chartEntry result:", JSON.stringify(chartEntry, null, 2));

    // ===================================================
    // 2️⃣ If chart failed → DO NOT CHARGE
    // ===================================================
    if (!chartEntry?.ok) {
      return res.status(400).json({
        ok: false,
        error: "chart_data_unavailable",
        details:
          chartEntry?.warnings?.[0] || "Chart analysis unavailable",
      });
    }

    // ===================================================
    // 3️⃣ Charge ONLY if analysis is valid
    // ===================================================
    const feeResult = await chargeServiceFee({
      user,
      amountSol: CHART_ANALYSIS_FEE_SOL,
      type: "chart_analysis_fee",
      tokenMint: cleanTokenMint,
    });

    // ===================================================
    // 4️⃣ Return result
    // ===================================================
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

  if (
    error?.message?.includes("insufficient") ||
    error?.message?.includes("balance")
  ) {
    return res.status(400).json({
      ok: false,
      error: "insufficient_balance",
      message: "You do not have enough SOL to run chart analysis",
    });
  }

  return res.status(500).json({
    ok: false,
    error: "Failed to run chart analysis",
    details: error?.message || String(error),
  });
}
});

export default router;