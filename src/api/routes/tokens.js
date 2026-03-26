// src/api/routes/tokens.js

import express from "express";
import { formatScanResponse } from "../../scanner/tokenSafetyEngine.js";
import { fetchTokenMarketData } from "../../scanner/fetchTokenMarketData.js";
import { fetchTokenHolderData } from "../../scanner/fetchTokenHolderData.js";

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

    let market;
    let holderData;

    try {
      market = await fetchTokenMarketData(tokenMint);
    } catch (err) {
      if ((err?.message || "").includes("No market pairs found")) {
        const response = formatScanResponse({
          token: {
            mintAddress: tokenMint.trim(),
            symbol: "UNKNOWN",
            name: "Unknown Token",
            boosted: false,
          },
          rawMetrics: {
            ageMinutes: null,
            liquidityUsd: null,
            marketCapUsd: null,
            volume5mUsd: null,
            buys5m: null,
            sells5m: null,
            holderCount: null,
            largestHolderPercent: null,
            top10HoldingPercent: null,
            smartDegenCount: 0,
            botDegenCount: 0,
            ratTraderCount: 0,
            alphaCallerCount: 0,
            sniperWalletCount: null,
            bundleScore: null,
            bundledWalletCount: null,
            fundingClusterScore: null,
            largestFundingCluster: null,
            momentumScore: null,
            velocityBreakoutScore: null,
            boosted: false,
          },
          options: {
            scannedAt: new Date(),
          },
        });

        return res.status(200).json({
          ok: true,
          walletAddress: walletAddress || null,
          tokenMint: tokenMint.trim(),
          pairAddress: null,
          dexId: null,
          chainId: "solana",
          ...response,
          evaluation: {
            ...response.evaluation,
            warnings: [
              ...(response.evaluation?.warnings || []),
              "No live market pair found for this token yet",
            ],
          },
        });
      }

      throw err;
    }

    holderData = await fetchTokenHolderData(tokenMint, {
      excludeAddresses: [],
    });

    const rawMetrics = {
      ageMinutes: market.metrics.ageMinutes,
      liquidityUsd: market.metrics.liquidityUsd,
      marketCapUsd: market.metrics.marketCapUsd,
      volume5mUsd: market.metrics.volume5mUsd,
      buys5m: market.metrics.buys5m,
      sells5m: market.metrics.sells5m,
      boosted: market.metrics.boosted,

      holderCount: holderData.holderCount,
      largestHolderPercent: holderData.largestHolderPercent,
      top10HoldingPercent: holderData.top10HoldingPercent,

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
      rawHolderCount: holderData.rawHolderCount,
      rawLargestHolderPercent: holderData.rawLargestHolderPercent,
      rawTop10HoldingPercent: holderData.rawTop10HoldingPercent,
      excludedAccounts: holderData.excludedAccounts,
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