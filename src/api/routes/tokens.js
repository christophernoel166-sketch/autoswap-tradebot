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
import { fetchWalletIntelligenceData } from "../../scanner/fetchWalletIntelligenceData.js";
import { fetchMomentumData } from "../../scanner/fetchMomentumData.js";
import { fetchRiskStructureData } from "../../scanner/fetchRiskStructureData.js";
import { fetchProfitWalletData } from "../../scanner/fetchProfitWalletData.js";
import User from "../../../models/User.js";

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
          
      momentum: {
  momentumScore: null,
  velocityBreakoutScore: null,
  momentumWarning:
    "No market pair found, so momentum checks could not run",
},
     
riskStructure: {
  bundleScore: null,
  bundledWalletCount: null,
  fundingClusterScore: null,
  largestFundingCluster: null,
  riskStructureWarning:
    "No market pair found, so risk structure checks could not run",
},   

profitWallets: {
  profitableWalletCount: null,
  walletQualityScore: null,
  profitWalletConfidence: null,
  profitWalletWarning:
    "No market pair found, so profit wallet checks could not run",
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
    marketContext: {
      dexId: market?.token?.dexId || market?.rawPair?.dexId || "",
      labels: market?.rawPair?.labels || [],
    },
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

// ================= WALLET INTELLIGENCE =================
const walletIntel = await fetchWalletIntelligenceData({
  tokenMint: tokenMint.trim(),
  holderData,
  market,
});

    // ================= RUG RISK =================
    const rugRiskData = await fetchRugRiskData({
      tokenMint: tokenMint.trim(),
      market,
      holderData,
      context: {},
    });


const momentumData = await fetchMomentumData({
  tokenMint: tokenMint.trim(),
  market,
  context: {},
});

const riskStructureData = await fetchRiskStructureData({
  tokenMint: tokenMint.trim(),
  market,
  holderData,
  context: {},
});

const profitWalletData = await fetchProfitWalletData({
  tokenMint: tokenMint.trim(),
  holderData,
  walletIntel,
  market,
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

   

smartDegenCount: walletIntel.smartDegenCount,
botDegenCount: walletIntel.botDegenCount,
ratTraderCount: walletIntel.ratTraderCount,
sniperWalletCount: walletIntel.sniperWalletCount,

profitableWalletCount: profitWalletData.profitableWalletCount,
walletQualityScore: profitWalletData.walletQualityScore,
profitWalletConfidence: profitWalletData.profitWalletConfidence,

bundleScore: riskStructureData.bundleScore,
bundledWalletCount: riskStructureData.bundledWalletCount,
fundingClusterScore: riskStructureData.fundingClusterScore,
largestFundingCluster: riskStructureData.largestFundingCluster,

      momentumScore: momentumData.momentumScore,
velocityBreakoutScore: momentumData.velocityBreakoutScore,

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
...(walletIntel.walletIntelligenceWarning
  ? [walletIntel.walletIntelligenceWarning]
  : []),
...(momentumData.momentumWarning ? [momentumData.momentumWarning] : []),
...(riskStructureData.riskStructureWarning
  ? [riskStructureData.riskStructureWarning]
  : []),
...(profitWalletData.profitWalletWarning
  ? [profitWalletData.profitWalletWarning]
  : []),

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
      momentum: momentumData,
riskStructure: riskStructureData,
profitWallets: profitWalletData,
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
// CUSTOM MODE SCAN ROUTE
// Layer 2 + Layer 3 only
// =====================================================
router.post("/scan-custom-mode", async (req, res) => {
  try {
    const { tokenMint, walletAddress } = req.body || {};

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

    // This route is only for custom mode ON
    if (!user.customConditionMode) {
      return res.status(400).json({
        ok: false,
        error: "custom_condition_mode_is_off",
      });
    }

    const conditions = user.tokenConditions || {};
    const hasConditions = hasAnyTokenCondition(conditions);

    // ===================================================
    // LAYER 2
    // Toggle ON, no condition set
    // Existing scanner must NOT be used
    // Buy should be allowed with warning
    // ===================================================
    if (!hasConditions) {
      return res.status(200).json({
        ok: true,
        mode: "custom",
        walletAddress: cleanWalletAddress,
        tokenMint: cleanTokenMint,
        pairAddress: null,
        dexId: null,
        chainId: "solana",
        token: {
          mintAddress: cleanTokenMint,
          symbol: "UNKNOWN",
          name: "Custom Mode Token",
          boosted: false,
        },
        metrics: {
          ageMinutes: null,
          liquidityUsd: null,
          marketCapUsd: null,
          volume5mUsd: null,
          buys5m: null,
          sells5m: null,
          largestHolderPercent: null,
          top10HoldingPercent: null,
          smartDegenCount: null,
          botDegenCount: null,
          ratTraderCount: null,
          alphaCallerCount: null,
          sniperWalletCount: null,
          bundledWalletCount: null,
          fundingClusterScore: null,
          largestFundingCluster: null,
          walletParticipationScore: null,
          velocitySanityScore: null,
          bundleSuspicionScore: null,
        },
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
        },
        rugRisk: {
          devDumpRiskScore: null,
          liquidityPullRiskScore: null,
          insiderRiskScore: null,
          rugRiskScore: null,
          rugRiskLevel: null,
        },
        riskStructure: {
          bundleScore: null,
          bundledWalletCount: null,
          fundingClusterScore: null,
          largestFundingCluster: null,
        },
        topHolders: [],
        excludedAccounts: [],
        holderWarning: null,
        evaluation: {
          verdict: "NO_CONDITION_SET",
          score: null,
          showBuy: true,
          buyConfidence: "MEDIUM",
          reasons: [],
          warnings: [
            "Custom condition mode is ON",
            "No condition has been set",
            "Default scanner was not used",
            "This token might not be safe for trade",
          ],
          failedRules: [],
        },
        scannedAt: new Date(),
        expiresAt: null,
        customMode: {
          enabled: true,
          hasConditions: false,
          bypassedDefaultScanner: true,
        },
      });
    }

    // ===================================================
    // LAYER 3
    // Toggle ON, condition exists
    // Existing scanner must NOT be used
    // Only fetch data needed for condition matching
    // ===================================================
    const market = await fetchTokenMarketData(cleanTokenMint);

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

    let holderData = {
      largestHolderPercent: null,
      top10HoldingPercent: null,
      topHolders: [],
      excludedAccounts: [],
      holderWarning: null,
    };

    try {
      holderData = await fetchTokenHolderData(cleanTokenMint, {
        excludeAddresses: getExcludedHolderAddressesForMint(cleanTokenMint),
        marketContext: {
          dexId: market?.token?.dexId || market?.rawPair?.dexId || "",
          labels: market?.rawPair?.labels || [],
        },
      });
    } catch (err) {
      console.warn("Custom mode holder scan failed:", err?.message);
      holderData.holderWarning = "Holder scan temporarily unavailable";
    }

    const integrityData = await fetchMarketIntegrityData({
      tokenMint: cleanTokenMint,
      market,
      context: {
        recentTrades: [],
      },
    });

    const walletIntel = await fetchWalletIntelligenceData({
      tokenMint: cleanTokenMint,
      holderData,
      market,
    });

    const rugRiskData = await fetchRugRiskData({
      tokenMint: cleanTokenMint,
      market,
      holderData,
      context: {},
    });

    const riskStructureData = await fetchRiskStructureData({
      tokenMint: cleanTokenMint,
      market,
      holderData,
      context: {},
    });

    const conditionCheck = matchTokenConditions({
      market,
      holderData,
      social: enrichedSocialData,
      integrity: integrityData,
      walletIntel,
      riskStructure: riskStructureData,
      rugRisk: rugRiskData,
      conditions,
    });

    return res.status(200).json({
      ok: true,
      mode: "custom",
      walletAddress: cleanWalletAddress,
      tokenMint: cleanTokenMint,
      pairAddress: market.token?.pairAddress || null,
      dexId: market.token?.dexId || null,
      chainId: market.token?.chainId || "solana",
      token: {
        mintAddress: cleanTokenMint,
        symbol: market.token?.symbol || "UNKNOWN",
        name: market.token?.name || "Custom Mode Token",
        boosted: market.metrics?.boosted || false,
      },
      metrics: {
        ageMinutes: market.metrics?.ageMinutes ?? null,
        liquidityUsd: market.metrics?.liquidityUsd ?? null,
        marketCapUsd: market.metrics?.marketCapUsd ?? null,
        volume5mUsd: market.metrics?.volume5mUsd ?? null,
        buys5m: market.metrics?.buys5m ?? null,
        sells5m: market.metrics?.sells5m ?? null,
        largestHolderPercent: holderData?.largestHolderPercent ?? null,
        top10HoldingPercent: holderData?.top10HoldingPercent ?? null,
        smartDegenCount: walletIntel?.smartDegenCount ?? null,
        botDegenCount: walletIntel?.botDegenCount ?? null,
        ratTraderCount: walletIntel?.ratTraderCount ?? null,
        alphaCallerCount: walletIntel?.alphaCallerCount ?? null,
        sniperWalletCount: walletIntel?.sniperWalletCount ?? null,
        bundledWalletCount: riskStructureData?.bundledWalletCount ?? null,
        fundingClusterScore: riskStructureData?.fundingClusterScore ?? null,
        largestFundingCluster: riskStructureData?.largestFundingCluster ?? null,
        walletParticipationScore: integrityData?.walletParticipationScore ?? null,
        velocitySanityScore: integrityData?.velocitySanityScore ?? null,
        bundleSuspicionScore: integrityData?.bundleSuspicionScore ?? null,
      },
      social: enrichedSocialData,
      integrity: integrityData,
      rugRisk: rugRiskData,
      riskStructure: riskStructureData,
      topHolders: holderData?.topHolders || [],
      excludedAccounts: holderData?.excludedAccounts || [],
      holderWarning: holderData?.holderWarning || null,
      evaluation: {
        verdict: conditionCheck.passed
          ? "CONDITION_MATCHED"
          : "CONDITION_NOT_MET",
        score: null,
        showBuy: conditionCheck.passed,
        buyConfidence: conditionCheck.passed ? "HIGH" : "NONE",
        reasons: conditionCheck.passed
          ? ["Token matched your saved custom conditions"]
          : [],
        warnings: [
          "Custom condition mode is ON",
          "Default scanner was not used",
        ],
        failedRules: conditionCheck.failedRules,
      },
      scannedAt: new Date(),
      expiresAt: null,
      customMode: {
        enabled: true,
        hasConditions: true,
        bypassedDefaultScanner: true,
      },
    });
  } catch (error) {
    console.error("POST /api/tokens/scan-custom-mode error:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to scan token in custom mode",
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