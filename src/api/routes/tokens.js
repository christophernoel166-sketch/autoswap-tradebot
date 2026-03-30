// src/api/routes/tokens.js

import express from "express";
import { formatScanResponse, canExecuteManualBuy } from "../../scanner/tokenSafetyEngine.js";
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
            boosted: false,
          },
          options: { scannedAt: new Date() },
        });

        return res.status(200).json({
          ok: true,
          tokenMint: tokenMint.trim(),
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
    };

    try {
      holderData = await fetchTokenHolderData(tokenMint, {
        excludeAddresses: getExcludedHolderAddressesForMint(tokenMint),
      });
    } catch (err) {
      console.warn("Holder scan failed:", err?.message);
    }

    // ================= METRICS =================
    const rawMetrics = {
      ageMinutes: market.metrics.ageMinutes,
      liquidityUsd: market.metrics.liquidityUsd,
      marketCapUsd: market.metrics.marketCapUsd,
      volume5mUsd: market.metrics.volume5mUsd,
      buys5m: market.metrics.buys5m,
      sells5m: market.metrics.sells5m,
      boosted: market.metrics.boosted,

      largestHolderPercent: holderData.largestHolderPercent,
      top10HoldingPercent: holderData.top10HoldingPercent,

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
      token: market.token,
      rawMetrics,
      options: { scannedAt: new Date() },
    });

    return res.status(200).json({
      ok: true,
      tokenMint: tokenMint.trim(),
      ...response,
      activity: activityData,
      social: enrichedSocialData,
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
    const { walletAddress, tokenMint, source } = req.body || {};

    if (!walletAddress || !tokenMint) {
      return res.status(400).json({
        ok: false,
        error: "walletAddress and tokenMint are required",
      });
    }

    const cleanWalletAddress = walletAddress.trim();
    const cleanTokenMint = tokenMint.trim();

    const market = await fetchTokenMarketData(cleanTokenMint);

    const rawMetrics = {
      ageMinutes: market.metrics.ageMinutes,
      liquidityUsd: market.metrics.liquidityUsd,
      marketCapUsd: market.metrics.marketCapUsd,
      volume5mUsd: market.metrics.volume5mUsd,
      buys5m: market.metrics.buys5m,
      sells5m: market.metrics.sells5m,
      largestHolderPercent: 10,
      top10HoldingPercent: 25,
      bundleScore: 4,
      bundledWalletCount: 1,
      fundingClusterScore: 0,
      largestFundingCluster: 0,
      momentumScore: 50,
      velocityBreakoutScore: 50,
      sniperWalletCount: 5,
    };

    const scan = formatScanResponse({
      token: market.token,
      rawMetrics,
      options: { scannedAt: new Date() },
    });

    const check = canExecuteManualBuy(scan, new Date());

    if (!check.ok) {
      return res.status(400).json({
        ok: false,
        error: check.reason,
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
      source: source || MANUAL_BUY_CHANNEL_ID,
    };

    await enqueueBuyJob(job);

    return res.status(200).json({
      ok: true,
      message: "Manual buy queued",
      job,
    });

  } catch (error) {
    console.error("manual-buy error:", error);

    return res.status(500).json({
      ok: false,
      error: "Manual buy failed",
    });
  }
});

export default router;