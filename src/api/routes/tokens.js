// src/api/routes/tokens.js

import express from "express";
import { formatScanResponse } from "../../scanner/tokenSafetyEngine.js";

const router = express.Router();

/**
 * POST /api/tokens/scan
 *
 * Temporary version:
 * - accepts tokenMint from frontend
 * - returns mock scan data
 * - runs through tokenSafetyEngine
 *
 * Later, we will replace the mock metrics with real scanner services.
 */
router.post("/scan", async (req, res) => {
  try {
    const { tokenMint, walletAddress } = req.body || {};

    if (!tokenMint || typeof tokenMint !== "string") {
      return res.status(400).json({
        ok: false,
        error: "tokenMint is required",
      });
    }

    // Temporary mock token info
    const token = {
      mintAddress: tokenMint.trim(),
      symbol: "TOKEN",
      name: "Scanned Token",
      boosted: true,
    };

    // Temporary mock metrics
    // Replace this later with real fetches from DexScreener / holders / momentum / etc.
    const rawMetrics = {
      ageMinutes: 49,
      liquidityUsd: 24078.87,
      marketCapUsd: 92727,
      volume5mUsd: 9551.77,
      buys5m: 261,
      sells5m: 218,

      holderCount: 1245,
      largestHolderPercent: 12.42,
      top10HoldingPercent: 18.54,

      smartDegenCount: 0,
      botDegenCount: 0,
      ratTraderCount: 0,
      alphaCallerCount: 0,
      sniperWalletCount: 10,

      bundleScore: 6,
      bundledWalletCount: 2,
      fundingClusterScore: 0,
      largestFundingCluster: 0,

      momentumScore: 75,
      velocityBreakoutScore: 100,

      boosted: true,
    };

    const response = formatScanResponse({
      token,
      rawMetrics,
      options: {
        scannedAt: new Date(),
      },
    });

    return res.status(200).json({
      ok: true,
      walletAddress: walletAddress || null,
      tokenMint: tokenMint.trim(),
      ...response,
    });
  } catch (error) {
    console.error("POST /api/tokens/scan error:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to scan token",
      details: error?.message || String(error),
    });
  }
});

export default router;