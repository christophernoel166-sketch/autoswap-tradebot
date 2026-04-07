// src/api/routes/tokens.js

import express from "express";
import {
  formatScanResponse,
  canExecuteManualBuy,
} from "../../scanner/tokenSafetyEngine.js";
import { fetchTokenMarketData } from "../../scanner/fetchTokenMarketData.js";
import { fetchTokenHolderData } from "../../scanner/fetchTokenHolderData.js";
import { getExcludedHolderAddressesForMint } from "../../scanner/excludedHolderAccounts.js";
import { fetchTokenSocialData } from "../../scanner/fetchTokenSocialData.js";
import { checkWebsiteStatus } from "../../scanner/checkWebsiteStatus.js";
import { checkSocialStatus } from "../../scanner/checkSocialStatus.js";
import { fetchAlphaActivityData } from "../../scanner/fetchAlphaActivityData.js";
import { fetchTelegramAlphaPosts } from "../../scanner/fetchTelegramAlphaPosts.js";
import { fetchXPumpReplyData } from "../../scanner/fetchXPumpReplyData.js";
import { fetchRecentXPosts } from "../../scanner/fetchRecentXPosts.js";
import { getAlphaCallers } from "../../scanner/alphaCallers.js";
import { acquireBuyLock, enqueueBuyJob } from "../../queue/tradeQueue.js";
import { fetchMarketIntegrityData } from "../../scanner/fetchMarketIntegrityData.js";
import { fetchRugRiskData } from "../../scanner/fetchRugRiskData.js";

const router = express.Router();
const MANUAL_BUY_CHANNEL_ID = "manual_dashboard";

// =====================================================
// SCAN ROUTE
// =====================================================
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

    // ================= MARKET FETCH =================
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
            walletParticipationScore: null,
            velocitySanityScore: null,
            washTradingRiskScore: null,
            bundleSuspicionScore: null,
            artificialVolumeFlag: null,
            fakeMomentumFlag: null,
            devDumpRiskScore: null,
            liquidityPullRiskScore: null,
            insiderRiskScore: null,
            rugRiskScore: null,
            boosted: false,
          },
          options: { scannedAt: new Date() },
        });

        return res.status(200).json({
          ok: true,
          walletAddress: walletAddress || null,
          tokenMint: tokenMint.trim(),
          pairAddress: null,
          dexId: null,
          chainId: "solana",
          topHolders: [],
          excludedAccounts: [],
          holderWarning: "No market pair found, so holder analysis could not run",
          social: {
            websiteUrl: null,
            telegramUrl: null,
            twitterUrl: null,
            hasWebsite: false,
            hasTelegram: false,
            hasTwitter: false,
            websiteWorking: null,
            telegramWorking: null,
            twitterWorking: null,
            socialWarning: "No market pair found, so social checks could not run",
          },
          activity: {
            alphaCallerCount: 0,
            alphaCallerMentions: [],
            alphaCallerScore: null,
            xReplyCount: null,
            telegramReplyCount: null,
            telegramActivityScore: null,
            xActivityScore: null,
            xPumpReplyScore: null,
            xPumpReplyMentions: [],
            activityWarning: "No market pair found, so activity checks could not run",
          },
          integrity: {
            buySellRatio5m: null,
            uniqueBuyerCount5m: null,
            uniqueSellerCount5m: null,
            walletParticipationRatio: null,
            walletParticipationScore: null,
            volumePerTx5m: null,
            volumePerUniqueBuyer5m: null,
            velocitySanityScore: null,
            washTradingRiskScore: null,
            bundleSuspicionScore: null,
            artificialVolumeFlag: null,
            fakeMomentumFlag: null,
            integrityWarning: "No market pair found, so integrity checks could not run",
          },
          rugRisk: {
            devDumpRiskScore: null,
            liquidityPullRiskScore: null,
            insiderRiskScore: null,
            rugRiskScore: null,
            rugRiskLevel: null,
            rugWarning: "No market pair found, so rug checks could not run",
          },
          ...response,
        });
      }

      throw err;
    }

    // ================= SOCIAL =================
    const socialData = fetchTokenSocialData(market.rawPair);
    let enrichedSocialData = { ...socialData };

    if (socialData.websiteUrl) {
      const websiteCheck = await checkWebsiteStatus(socialData.websiteUrl);

      enrichedSocialData = {
        ...enrichedSocialData,
        websiteWorking: websiteCheck.websiteWorking,
      };

      if (websiteCheck.websiteWarning) {
        enrichedSocialData.socialWarning = websiteCheck.websiteWarning;
      }
    }

    enrichedSocialData = await checkSocialStatus(enrichedSocialData);

    // ================= TELEGRAM =================
    const telegramAlpha = await fetchTelegramAlphaPosts({
      recentTelegramMessages: [],
    });

    // ================= X =================
    const xHandles = getAlphaCallers()
      .filter((c) => c.source === "twitter")
      .map((c) => c.handle);

    const recentX = await fetchRecentXPosts({
      handles: xHandles,
      limitPerHandle: 5,
    });

    // ================= ACTIVITY =================
    const activityData = await fetchAlphaActivityData({
      tokenMint: tokenMint.trim(),
      token: market.token,
      social: enrichedSocialData,
      context: {
        recentPosts: [...telegramAlpha.posts, ...recentX.posts],
      },
    });

    const xPumpReplyData = await fetchXPumpReplyData({
      tokenMint: tokenMint.trim(),
      token: market.token,
      social: enrichedSocialData,
      context: {
        recentXPosts: recentX.posts,
      },
    });

    activityData.xReplyCount = xPumpReplyData.xReplyCount;
    activityData.xPumpReplyScore = xPumpReplyData.xPumpReplyScore;

    // ================= HOLDERS =================
    let holderData = {
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
      console.warn("Holder scan failed:", err?.message);
      holderData.holderWarning = "Holder scan temporarily unavailable";
    }

    // ================= INTEGRITY =================
    const integrityData = await fetchMarketIntegrityData({
      tokenMint: tokenMint.trim(),
      market,
      context: {
        recentTrades: [],
      },
    });

    // ================= RUG RISK =================
    const rugRiskData = await fetchRugRiskData({
      tokenMint: tokenMint.trim(),
      market,
      holderData,
      context: {},
    });

    // ================= METRICS =================
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

      const walletIntel = await fetchWalletIntelligenceData({
  tokenMint: tokenMint.trim(),
  holderData,
  market,
});

smartDegenCount: walletIntel.smartDegenCount,
botDegenCount: walletIntel.botDegenCount,
ratTraderCount: walletIntel.ratTraderCount,
sniperWalletCount: walletIntel.sniperWalletCount,

      bundleScore: 4,
      bundledWalletCount: 1,
      fundingClusterScore: 0,
      largestFundingCluster: 0,

      momentumScore: 50,
      velocityBreakoutScore: 50,

      // market integrity / anti-fake-pump metrics
      walletParticipationScore: integrityData.walletParticipationScore,
      velocitySanityScore: integrityData.velocitySanityScore,
      washTradingRiskScore: integrityData.washTradingRiskScore,
      bundleSuspicionScore: integrityData.bundleSuspicionScore,
      artificialVolumeFlag: integrityData.artificialVolumeFlag,
      fakeMomentumFlag: integrityData.fakeMomentumFlag,

      // rug risk metrics
      devDumpRiskScore: rugRiskData.devDumpRiskScore,
      liquidityPullRiskScore: rugRiskData.liquidityPullRiskScore,
      insiderRiskScore: rugRiskData.insiderRiskScore,
      rugRiskScore: rugRiskData.rugRiskScore,
    };

    const response = formatScanResponse({
      token: market.token,
      rawMetrics,
      options: { scannedAt: new Date() },
    });

    const mergedWarnings = [
      ...(response.evaluation?.warnings || []),
      ...(holderData.holderWarning ? [holderData.holderWarning] : []),
      ...(enrichedSocialData.socialWarning
        ? [enrichedSocialData.socialWarning]
        : []),
      ...(activityData.activityWarning ? [activityData.activityWarning] : []),
      ...(integrityData.integrityWarning ? [integrityData.integrityWarning] : []),
      ...(rugRiskData.rugWarning ? [rugRiskData.rugWarning] : []),
    ]
      .filter(Boolean)
      .filter((warning, index, arr) => arr.indexOf(warning) === index);

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
      integrity: integrityData,
      rugRisk: rugRiskData,
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

// =====================================================
// MANUAL BUY ROUTE
// =====================================================
router.post("/manual-buy", async (req, res) => {
  try {
    const { walletAddress, tokenMint, source, scanResult } = req.body || {};

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

    if (!scanResult || typeof scanResult !== "object") {
      return res.status(400).json({
        ok: false,
        error: "scanResult is required. Please rescan token.",
      });
    }

    const cleanWalletAddress = walletAddress.trim();
    const cleanTokenMint = tokenMint.trim();
    const cleanSource =
      typeof source === "string" && source.trim()
        ? source.trim()
        : MANUAL_BUY_CHANNEL_ID;

    const scan = {
      evaluation: scanResult.evaluation,
      expiresAt: scanResult.expiresAt,
      scannedAt: scanResult.scannedAt,
    };

    console.log("manual-buy using provided scanResult:", scan);

    const check = canExecuteManualBuy(
      {
        evaluation: scan.evaluation,
        expiresAt: scan.expiresAt,
      },
      new Date()
    );

    if (!check.ok) {
      return res.status(400).json({
        ok: false,
        error: check.reason,
        evaluation: scan.evaluation,
        expiresAt: scan.expiresAt,
      });
    }

    const locked = await acquireBuyLock(cleanWalletAddress, cleanTokenMint);

    if (!locked) {
      return res.status(409).json({
        ok: false,
        error: "Already queued",
      });
    }

    const job = {
      walletAddress: cleanWalletAddress,
      mint: cleanTokenMint,
      channelId: MANUAL_BUY_CHANNEL_ID,
      createdAt: Date.now(),
      manual: true,
      source: cleanSource,
    };

    await enqueueBuyJob(job);

    return res.status(200).json({
      ok: true,
      message: "Manual buy queued successfully",
      job,
      evaluation: scan.evaluation,
      expiresAt: scan.expiresAt,
    });
  } catch (error) {
    console.error("manual-buy error:", error);

    return res.status(500).json({
      ok: false,
      error: "Manual buy failed",
      details: error?.message || String(error),
    });
  }
});

export default router;