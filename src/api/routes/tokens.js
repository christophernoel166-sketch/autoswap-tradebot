// src/api/routes/tokens.js

import express from "express";
import { formatScanResponse } from "../../scanner/tokenSafetyEngine.js";
import { fetchTokenMarketData } from "../../scanner/fetchTokenMarketData.js";

const router = express.Router();

router.post("/scan", async (req, res) => {
  try {
    const { tokenMint, walletAddress } = req.body || {};

    if (!tokenMint || typeof tokenMint !== "string") {
      return res.status(400).json({
        ok: false,
        error: "tokenMint is required",
      });
    }

    const market = await fetchTokenMarketData(tokenMint);

    // Temporary placeholder metrics for categories we haven't made live yet.
    // We keep these conservative so the engine still works.
    const rawMetrics = {
      ageMinutes: market.metrics.ageMinutes,
      liquidityUsd: market.metrics.liquidityUsd,
      marketCapUsd: market.metrics.marketCapUsd,
      volume5mUsd: market.metrics.volume5mUsd,
      buys5m: market.metrics.buys5m,
      sells5m: market.metrics.sells5m,
      boosted: market.metrics.boosted,

      // Temporary placeholders until holder/risk/intelligence services are added
      holderCount: 100,
      largestHolderPercent: 15,
      top10HoldingPercent: 30,

      smartDegenCount: 0,
      botDegenCount: 0,
      ratTraderCount: 0,
      alphaCallerCount: 0,
      sniperWalletCount: 5,

      bundleScore: 4,
      bundledWalletCount: 1,
      fundingClusterScore: 0,
      largestFundingCluster: 0,

      momentumScore: 50,
      velocityBreakoutScore: 50,
    };

    const response = formatScanResponse({
      token: {
        mintAddress: market.token.mintAddress,
        symbol: market.token.symbol,
        name: market.token.name,
        boosted: market.token.boosted,
      },
      rawMetrics,
      options: {
        scannedAt: new Date(),
      },
    });

    return res.status(200).json({
      ok: true,
      walletAddress: walletAddress || null,
      tokenMint: tokenMint.trim(),
      pairAddress: market.token.pairAddress,
      dexId: market.token.dexId,
      chainId: market.token.chainId,
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