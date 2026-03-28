// src/api/routes/tokens.js

import express from "express";
import { formatScanResponse } from "../../scanner/tokenSafetyEngine.js";
import { fetchTokenMarketData } from "../../scanner/fetchTokenMarketData.js";
import { fetchTokenHolderData } from "../../scanner/fetchTokenHolderData.js";
import { getExcludedHolderAddressesForMint } from "../../scanner/excludedHolderAccounts.js";
import { fetchTokenSocialData } from "../../scanner/fetchTokenSocialData.js";
import { checkWebsiteStatus } from "../../scanner/checkWebsiteStatus.js";
import { checkSocialStatus } from "../../scanner/checkSocialStatus.js";
import { fetchAlphaActivityData } from "../../scanner/fetchAlphaActivityData.js";
import { fetchTelegramAlphaPosts } from "../../scanner/fetchTelegramAlphaPosts.js";

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
            alphaCallerCount: null,
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
          holderWarning: "No live market pair found for this token yet",
          excludedAccounts: [],
          social: {
            websiteUrl: null,
            telegramUrl: null,
            twitterUrl: null,
            hasWebsite: false,
            hasTelegram: false,
            hasTwitter: false,
            websiteWorking: null,
            alphaCallerCount: null,
            xReplyCount: null,
            telegramReplyCount: null,
            socialWarning: "No market pair found, so social links could not be extracted",
          },
          activity: {
            alphaCallerCount: 0,
            alphaCallerMentions: [],
            xReplyCount: null,
            telegramReplyCount: null,
            telegramActivityScore: null,
            xActivityScore: null,
            activityWarning: "No market pair found, so activity could not be analyzed",
          },
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

    const socialData = fetchTokenSocialData(market.rawPair);

    let enrichedSocialData = { ...socialData };

    if (socialData.websiteUrl) {
      const websiteCheck = await checkWebsiteStatus(socialData.websiteUrl);

      enrichedSocialData = {
        ...enrichedSocialData,
        websiteWorking: websiteCheck.websiteWorking,
        websiteStatusCode: websiteCheck.websiteStatusCode,
        websiteFinalUrl: websiteCheck.websiteFinalUrl,
      };

      if (websiteCheck.websiteWarning) {
        enrichedSocialData.socialWarning = websiteCheck.websiteWarning;
      }
    }

    enrichedSocialData = await checkSocialStatus(enrichedSocialData);

    if (enrichedSocialData.socialWarnings?.length) {
      enrichedSocialData.socialWarning = [
        enrichedSocialData.socialWarning,
        ...enrichedSocialData.socialWarnings,
      ]
        .filter(Boolean)
        .join(" | ");
    }

    const telegramAlpha = await fetchTelegramAlphaPosts({
  // Phase 1: no real live Telegram feed yet.
  // Later, replace [] with recent messages from your DB / bot ingestion pipeline.
  recentTelegramMessages: [],
});

const activityData = await fetchAlphaActivityData({
  tokenMint: tokenMint.trim(),
  token: market.token,
  social: enrichedSocialData,
  context: {
    pairAddress: market.token.pairAddress,
    dexId: market.token.dexId,
    chainId: market.token.chainId,
    recentPosts: telegramAlpha.posts,
  },
});

if (telegramAlpha.warning) {
  activityData.activityWarning = [
    activityData.activityWarning,
    telegramAlpha.warning,
  ]
    .filter(Boolean)
    .join(" | ");
}

    let holderData = {
      holderCount: null,
      largestHolderPercent: null,
      top10HoldingPercent: null,
      topHolders: [],
      excludedAccounts: [],
      holderWarning: null,
    };

    try {
      holderData = await fetchTokenHolderData(tokenMint, {
        excludeAddresses: getExcludedHolderAddressesForMint(tokenMint),
      });
    } catch (err) {
      console.warn("Holder scan failed:", err?.message || err);

      holderData = {
        holderCount: null,
        largestHolderPercent: null,
        top10HoldingPercent: null,
        topHolders: [],
        excludedAccounts: [],
        holderWarning:
          err?.message?.includes("429")
            ? "Holder analysis temporarily unavailable due to RPC rate limits"
            : "Holder analysis temporarily unavailable",
      };
    }

    const rawMetrics = {
      ageMinutes: market.metrics.ageMinutes,
      liquidityUsd: market.metrics.liquidityUsd,
      marketCapUsd: market.metrics.marketCapUsd,
      volume5mUsd: market.metrics.volume5mUsd,
      buys5m: market.metrics.buys5m,
      sells5m: market.metrics.sells5m,
      boosted: market.metrics.boosted,

      holderCount: null,
      largestHolderPercent: holderData.largestHolderPercent,
      top10HoldingPercent: holderData.top10HoldingPercent,

      smartDegenCount: 0,
      botDegenCount: 0,
      ratTraderCount: 0,
      alphaCallerCount: activityData.alphaCallerCount,
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

    const mergedWarnings = [
      ...(response.evaluation?.warnings || []),
      ...(holderData.holderWarning ? [holderData.holderWarning] : []),
      ...(enrichedSocialData.socialWarning
        ? [enrichedSocialData.socialWarning]
        : []),
      ...(activityData.activityWarning ? [activityData.activityWarning] : []),
    ];

    return res.status(200).json({
      ok: true,
      walletAddress: walletAddress || null,
      tokenMint: tokenMint.trim(),
      pairAddress: market.token.pairAddress,
      dexId: market.token.dexId,
      chainId: market.token.chainId,
      topHolders: holderData.topHolders || [],
      excludedAccounts: holderData.excludedAccounts || [],
      holderWarning: holderData.holderWarning || null,
      social: enrichedSocialData,
      activity: activityData,
      ...response,
      evaluation: {
        ...response.evaluation,
        warnings: mergedWarnings,
      },
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