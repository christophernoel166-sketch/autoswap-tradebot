/**
 * ============================================================
 * TOKEN SCAN SERVICE
 * ============================================================
 *
 * Reusable normal token scan pipeline extracted directly from
 * the existing /scan route in:
 *
 *   src/services/tokenScanService.js
 *
 * This service is intended to be used by:
 *
 *   1. Manual POST /scan
 *   2. Automatic discovery scanning
 *
 * The scanner calculations themselves are NOT being recreated.
 * This is the existing scan pipeline moved behind a reusable
 * function.
 *
 * Custom-condition scanning remains separate.
 * ============================================================
 */

import {
  formatScanResponse,
} from "../scanner/tokenSafetyEngine.js";

import { fetchTokenMarketData }
  from "../scanner/fetchTokenMarketData.js";

import { fetchTokenHolderData }
  from "../scanner/fetchTokenHolderData.js";

import {
  getExcludedHolderAddressesForMint,
} from "../scanner/excludedHolderAccounts.js";

import { fetchTokenSocialData }
  from "../scanner/fetchTokenSocialData.js";

import { checkWebsiteStatus }
  from "../scanner/checkWebsiteStatus.js";

import { checkSocialStatus }
  from "../scanner/checkSocialStatus.js";

import { fetchAlphaActivityData }
  from "../scanner/fetchAlphaActivityData.js";

import { fetchTelegramAlphaPosts }
  from "../scanner/fetchTelegramAlphaPosts.js";

import { fetchXPumpReplyData }
  from "../scanner/fetchXPumpReplyData.js";

import { fetchRecentXPosts }
  from "../scanner/fetchRecentXPosts.js";

import { getAlphaCallers }
  from "../scanner/alphaCallers.js";

import { fetchMarketIntegrityData }
  from "../scanner/fetchMarketIntegrityData.js";

import { fetchRugRiskData }
  from "../scanner/fetchRugRiskData.js";

import { fetchWalletIntelligenceData }
  from "../scanner/fetchWalletIntelligenceData.js";

import { fetchMomentumData }
  from "../scanner/fetchMomentumData.js";

import { fetchRiskStructureData }
  from "../scanner/fetchRiskStructureData.js";

import { fetchProfitWalletData }
  from "../scanner/fetchProfitWalletData.js";

import { analyzeChartEntry }
  from "./chartEntryService.js";

import { fetchLiquidityLockStatus }
  from "../scanner/fetchLiquidityLockStatus.js";

import DiscoveredToken
  from "../api/models/DiscoveredToken.js";

import { fetchVolumeAnalysisData }
  from "../scanner/fetchVolumeAnalysisData.js";

import { fetchLiquidityAnalysisData }
  from "../scanner/fetchLiquidityAnalysisData.js";

import TokenOutcome from "../../models/TokenOutcome.js";

import { scoreSignal }
  from "./signalScoringService.js";

import { findSimilarPatterns }
  from "./learning/findSimilarPatterns.js";

import { buildAIRecommendation }
  from "./aiRecommendationService.js";

import {
  scanStarted,
  scanStage,
  scanCompleted,
  scanFailed,
} from "./aiWorkflowService.js";

import {
  saveTokenOutcome,
} from "./outcome/tokenOutcomeService.js";

import { fetchDeveloperProfile }
  from "../scanner/fetchDeveloperProfile.js";


export async function scanToken({
  tokenMint,
  walletAddress = null,
  mode = "MANUAL",
} = {}) {
  try {
    const cleanTokenMint =
      typeof tokenMint === "string"
        ? tokenMint.trim()
        : "";

    const cleanWalletAddress =
      typeof walletAddress === "string"
        ? walletAddress.trim()
        : undefined;

    if (!cleanTokenMint) {
      const error = new Error("tokenMint is required");
      error.statusCode = 400;
      throw error;
    }

    // Notify AI workflow that a scan has started
    scanStarted(
      cleanWalletAddress,
      cleanTokenMint
    );

    // ======================================================
    // Shared AI Context
    // ======================================================

    const aiContext = {
      // All engine outputs
      analyses: {},

      // Evidence collected from every engine
      evidence: {},

      // AI reasoning (filled later)
      reasoning: {},

      // Investment thesis (filled later)
      investmentThesis: {},

      // Final recommendation (filled later)
      recommendation: null,

      // Overall confidence
      confidence: 0,

      // Debug information
      debug: [],
    };

    let market;

    const liquidityLock =
      await fetchLiquidityLockStatus(
        cleanTokenMint
      );


    // ================= MARKET FETCH =================
    try {
  market = await fetchTokenMarketData(
    cleanTokenMint
  );

  aiContext.analyses.market =
    market;

  scanStage(
    cleanWalletAddress,
    "MARKET_ANALYSIS",
    10
  );

} catch (err) {

  if (
    (err?.message || "")
      .includes("No market pairs found")
  ) {

    const response =
      formatScanResponse({
        token: {
          mintAddress: cleanTokenMint,
          symbol: "UNKNOWN",
          name: "Unknown Token",
          boosted: false,
        },

        rawMetrics: {
          ageMinutes: null,
          liquidityUsd: null,

          liquidityLocked:
            liquidityLock.liquidityLocked,

          liquidityLockSource:
            liquidityLock.liquidityLockSource,

          liquidityLockReason:
            liquidityLock.liquidityLockReason,

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

        options: {
          scannedAt: new Date(),
        },
      });

    return {
      ...response,
      ok: true,

      walletAddress:
        cleanWalletAddress || null,

      tokenMint:
        cleanTokenMint,

      pairAddress: null,
      dexId: null,
      chainId: "solana",

      topHolders: [],
      excludedAccounts: [],

      holderWarning:
        "No market pair found, so holder analysis could not run",

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

        socialWarning:
          "No market pair found, so social checks could not run",
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

        activityWarning:
          "No market pair found, so activity checks could not run",
      },
    };
  }

  throw err;
}





    // ================= SOCIAL =================
    const socialData =
      fetchTokenSocialData(
        market.rawPair
      );

    let enrichedSocialData = {
      ...socialData,
    };

    if (socialData.websiteUrl) {
      const websiteCheck =
        await checkWebsiteStatus(
          socialData.websiteUrl
        );

      enrichedSocialData = {
        ...enrichedSocialData,

        websiteWorking:
          websiteCheck.websiteWorking,
      };

      if (websiteCheck.websiteWarning) {
        enrichedSocialData.socialWarning =
          websiteCheck.websiteWarning;
      }
    }

    enrichedSocialData =
      await checkSocialStatus(
        enrichedSocialData
      );

    aiContext.analyses.social =
      enrichedSocialData;

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
        recentPosts: [
          ...telegramAlpha.posts,
          ...recentX.posts,
        ],
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

    activityData.xReplyCount =
      xPumpReplyData.xReplyCount;

    activityData.xPumpReplyScore =
      xPumpReplyData.xPumpReplyScore;

    aiContext.analyses.activity =
      activityData;

    // ================= HOLDERS =================
    let holderData = {
      largestHolderPercent: null,
      top10HoldingPercent: null,
      topHolders: [],
      excludedAccounts: [],
      holderWarning: null,
    };

    try {
      console.log(
        "🔍 HOLDER SCAN REQUEST",
        tokenMint
      );

      holderData = await fetchTokenHolderData(
        tokenMint.trim(),
        {
          excludeAddresses:
            getExcludedHolderAddressesForMint(tokenMint),

          marketContext: {
            dexId:
              market?.token?.dexId ||
              market?.rawPair?.dexId ||
              "",

            labels:
              market?.rawPair?.labels || [],
          },

          market,
        },
        aiContext
      );

      aiContext.analyses.holders =
        holderData;

      scanStage(
        cleanWalletAddress,
        "HOLDER_ANALYSIS",
        20
      );

    } catch (err) {
      console.warn(
        "Holder scan failed:",
        err?.message
      );

      holderData.holderWarning =
        "Holder scan temporarily unavailable";
    }

    // ================= INTEGRITY =================
    const integrityData =
      await fetchMarketIntegrityData({
        tokenMint: tokenMint.trim(),
        market,
        context: {
          ...aiContext,
          recentTrades: [],
        },
      });

    aiContext.analyses.integrity =
      integrityData;

    scanStage(
      cleanWalletAddress,
      "MARKET_INTEGRITY",
      35
    );

    // ================= WALLET INTELLIGENCE =================
    const walletIntel =
      await fetchWalletIntelligenceData({
        tokenMint: tokenMint.trim(),
        holderData,
        market,
        context: aiContext,
      });

    aiContext.analyses.wallets =
      walletIntel;

    scanStage(
      cleanWalletAddress,
      "WALLET_INTELLIGENCE",
      45
    );

    // ================= RUG RISK =================
    const rugRiskData =
      await fetchRugRiskData({
        tokenMint: tokenMint.trim(),
        market,
        holderData,
        context: aiContext,
      });

    aiContext.analyses.rugRisk =
      rugRiskData;

    scanStage(
      cleanWalletAddress,
      "RUG_RISK",
      55
    );

// ================= MOMENTUM =================
const momentumData = await fetchMomentumData({
  tokenMint: cleanTokenMint,
  market,
  context: aiContext,
});

aiContext.analyses.momentum =
  momentumData;

scanStage(
  cleanWalletAddress,
  "MOMENTUM",
  65
);

// ================= VOLUME ANALYSIS =================
const discoveredToken =
  await DiscoveredToken.findOne({
    mintAddress: cleanTokenMint,
  }).lean();

const volumeAnalysis =
  await fetchVolumeAnalysisData({
    volume5mUsd:
      market.metrics.volume5mUsd,

    buys5m:
      market.metrics.buys5m,

    sells5m:
      market.metrics.sells5m,

    previousVolume5mUsd:
      discoveredToken?.previousVolume5mUsd || 0,

    previousBuys5m:
      discoveredToken?.previousBuys5m || 0,

    previousSells5m:
      discoveredToken?.previousSells5m || 0,

    context: aiContext,
  });

aiContext.analyses.volume =
  volumeAnalysis;


// ================= LIQUIDITY ANALYSIS =================
const liquidityAnalysis =
  await fetchLiquidityAnalysisData({
    liquidityUsd:
      market.metrics.liquidityUsd,

    previousLiquidityUsd:
      discoveredToken?.previousLiquidityUsd || 0,

    context: aiContext,
  });

aiContext.analyses.liquidity =
  liquidityAnalysis;

// ================= RISK STRUCTURE =================
const riskStructureData =
  await fetchRiskStructureData({
    tokenMint: cleanTokenMint,
    market,
    holderData,
    context: aiContext,
  });

aiContext.analyses.riskStructure =
  riskStructureData;

// ================= PROFIT WALLET ANALYSIS =================
const profitWalletData =
  await fetchProfitWalletData({
    tokenMint: cleanTokenMint,
    holderData,
    walletIntel,
    market,
    context: aiContext,
  });

aiContext.analyses.profitWallets =
  profitWalletData;

// ================= DEVELOPER INTELLIGENCE =================
const developerWallet =
  liquidityLock?.developerWallet || null;

const developerProfile =
  developerWallet
    ? await fetchDeveloperProfile(
        developerWallet
      )
    : null;

aiContext.analyses.developer =
  developerProfile;

    // ================= RAW METRICS =================
    const rawMetrics = {
      ageMinutes:
        market.metrics.ageMinutes,

      liquidityUsd:
        market.metrics.liquidityUsd,

      liquidityLocked:
        liquidityLock.liquidityLocked,

      liquidityLockSource:
        liquidityLock.liquidityLockSource,

      liquidityLockReason:
        liquidityLock.liquidityLockReason,

      marketCapUsd:
        market.metrics.marketCapUsd,

      volume5mUsd:
        market.metrics.volume5mUsd,

      buys5m:
        market.metrics.buys5m,

      sells5m:
        market.metrics.sells5m,

      holderCount:
        holderData.holderCount,

      largestHolderPercent:
        holderData.largestHolderPercent,

      top10HoldingPercent:
        holderData.top10HoldingPercent,

      smartDegenCount:
        walletIntel.smartDegenCount,

      botDegenCount:
        walletIntel.botDegenCount,

      ratTraderCount:
        walletIntel.ratTraderCount,

      alphaCallerCount:
        activityData.alphaCallerCount,

      sniperWalletCount:
        walletIntel.sniperWalletCount,

      bundleScore:
        integrityData.bundleScore,

      bundledWalletCount:
        integrityData.bundledWalletCount,

      fundingClusterScore:
        integrityData.fundingClusterScore,

      largestFundingCluster:
        integrityData.largestFundingCluster,

      momentumScore:
        momentumData.momentumScore,

      velocityBreakoutScore:
        momentumData.velocityBreakoutScore,

      walletParticipationScore:
        momentumData.walletParticipationScore,

      velocitySanityScore:
        momentumData.velocitySanityScore,

      washTradingRiskScore:
        integrityData.washTradingRiskScore,

      bundleSuspicionScore:
        integrityData.bundleSuspicionScore,

      artificialVolumeFlag:
        integrityData.artificialVolumeFlag,

      fakeMomentumFlag:
        integrityData.fakeMomentumFlag,

      devDumpRiskScore:
        rugRiskData.devDumpRiskScore,

      liquidityPullRiskScore:
        rugRiskData.liquidityPullRiskScore,

      insiderRiskScore:
        rugRiskData.insiderRiskScore,

      rugRiskScore:
        rugRiskData.rugRiskScore,

      boosted:
        market.token?.boosted || false,
    };


    // ================= FORMAT SCAN RESPONSE =================
    const response =
      formatScanResponse({
        token: market.token,

        rawMetrics,

        options: {
          scannedAt: new Date(),
        },
      });


    // ================= WARNINGS =================
    const mergedWarnings = [
      market.warning,
      holderData.holderWarning,
      enrichedSocialData.socialWarning,
      activityData.activityWarning,
      integrityData.integrityWarning,
      walletIntel.walletWarning,
      rugRiskData.rugWarning,
      riskStructureData.riskWarning,
      profitWalletData.profitWalletWarning,
    ].filter(Boolean);

    response.warnings =
      mergedWarnings;

// ================= CHART ENTRY =================
let chartEntry = null;

try {
  chartEntry =
    await analyzeChartEntry({
      tokenMint: cleanTokenMint,
      market,
      context: aiContext,
    });

} catch (err) {
  console.warn(
    "Chart analysis failed:",
    err?.message
  );
}

aiContext.analyses.chart =
  chartEntry;

scanStage(
  cleanWalletAddress,
  "CHART_ANALYSIS",
  75
);


// ================= FORECAST =================
let forecast = null;

function getForecastVerdict(score) {
  if (score >= 90)
    return "VERY_STRONG_BULLISH";

  if (score >= 75)
    return "STRONG_BULLISH";

  if (score >= 60)
    return "BULLISH";

  if (score >= 40)
    return "NEUTRAL";

  if (score >= 25)
    return "BEARISH";

  return "STRONG_BEARISH";
}

if (chartEntry?.ok) {
  const trendScore =
    Number(
      chartEntry.metrics?.trendStrength || 0
    );

  const volumeScore =
    Number(
      volumeAnalysis?.volumeScore || 0
    );

  const liquidityScore =
    Number(
      liquidityAnalysis?.liquidityScore || 0
    );

  const momentumScore =
    Number(
      momentumData?.momentumScore || 0
    );

  const walletQualityScore =
    Number(
      profitWalletData?.walletQualityScore || 0
    );

  const fundingClusterScore =
    Number(
      riskStructureData?.fundingClusterScore || 0
    );

  const priceChange24h =
    Number(
      market.metrics?.priceChange24h || 0
    );

  const momentum24h =
    Math.min(
      100,
      Math.abs(priceChange24h) / 20
    );

  // =========================
  // SHORT TERM (0-1H)
  // =========================

  const shortTermScore =
    Math.round(
      trendScore * 0.4 +
      volumeScore * 0.35 +
      liquidityScore * 0.25
    );

  // =========================
  // MID TERM (0-24H)
  // =========================

  const midTermScore =
    Math.round(
      trendScore * 0.25 +
      volumeScore * 0.30 +
      liquidityScore * 0.25 +
      momentum24h * 0.20
    );

  // =========================
  // LONG TERM (1-7D)
  // =========================

  const longTermScore =
    Math.round(
      liquidityScore * 0.30 +
      walletQualityScore * 0.25 +
      (100 - fundingClusterScore) * 0.20 +
      momentumScore * 0.25
    );

  const shortTermVerdict =
    getForecastVerdict(
      shortTermScore
    );

  const midTermVerdict =
    getForecastVerdict(
      midTermScore
    );

  const longTermVerdict =
    getForecastVerdict(
      longTermScore
    );

  // Backward compatibility
  const forecastScore =
    shortTermScore;

  const verdict =
    shortTermVerdict;

  forecast = {
    trendScore,
    volumeScore,
    liquidityScore,

    forecastScore,
    verdict,

    shortTerm: {
      score: shortTermScore,
      verdict:
        shortTermVerdict,
    },

    midTerm: {
      score: midTermScore,
      verdict:
        midTermVerdict,
    },

    longTerm: {
      score: longTermScore,
      verdict:
        longTermVerdict,
    },

    confidence:
      Math.round(
        (
          shortTermScore +
          midTermScore +
          longTermScore
        ) / 3
      ),
  };
}

// Store forecast for AI reasoning
aiContext.analyses.forecast =
  forecast;

scanStage(
  cleanWalletAddress,
  "FORECAST",
  85
);


// =====================================================
// Forecast AI Evidence
// =====================================================

if (forecast) {
  aiContext.evidence.forecast = {
    confidenceContribution:
      forecast.confidence,

    confidenceWeight: 8,

    strengths: [],

    weaknesses: [],

    risks: [],

    assumptions: [],

    convictionDrivers: [],

    monitoringPriorities: [
      "Monitor forecast direction",
      "Monitor short-term, mid-term, and long-term alignment",
    ],

    invalidationCriteria: [],
  };
}


// =====================================================
// CANONICAL AI EVIDENCE
// =====================================================
//
// Normalize scanner outputs into one canonical evidence
// contract for downstream AI reasoning.
//
// =====================================================

const addCanonicalEvidence = (
  key,
  {
    confidenceContribution = 0,
    confidenceWeight = 1,
    strengths = [],
    weaknesses = [],
    risks = [],
    assumptions = [],
    convictionDrivers = [],
    monitoringPriorities = [],
    invalidationCriteria = [],
  } = {}
) => {
  aiContext.evidence[key] = {
    confidenceContribution: Math.max(
      0,
      Math.min(100, Number(confidenceContribution) || 0)
    ),

    confidenceWeight: Math.max(
      0,
      Number(confidenceWeight) || 0
    ),

    strengths: Array.isArray(strengths)
      ? strengths.filter(Boolean)
      : [],

    weaknesses: Array.isArray(weaknesses)
      ? weaknesses.filter(Boolean)
      : [],

    risks: Array.isArray(risks)
      ? risks.filter(Boolean)
      : [],

    assumptions: Array.isArray(assumptions)
      ? assumptions.filter(Boolean)
      : [],

    convictionDrivers: Array.isArray(convictionDrivers)
      ? convictionDrivers.filter(Boolean)
      : [],

    monitoringPriorities: Array.isArray(
      monitoringPriorities
    )
      ? monitoringPriorities.filter(Boolean)
      : [],

    invalidationCriteria: Array.isArray(
      invalidationCriteria
    )
      ? invalidationCriteria.filter(Boolean)
      : [],
  };
};


// =====================================================
// MARKET EVIDENCE
// =====================================================

const marketMetrics =
  market?.metrics || {};

const marketLiquidity =
  Number(marketMetrics.liquidityUsd || 0);

const marketCap =
  Number(marketMetrics.marketCapUsd || 0);

const marketPrice =
  Number(marketMetrics.priceUsd || 0);

const volume5m =
  Number(marketMetrics.volume5mUsd || 0);

const buys5m =
  Number(marketMetrics.buys5m || 0);

const sells5m =
  Number(marketMetrics.sells5m || 0);

const marketBuySellRatio =
  sells5m > 0
    ? buys5m / sells5m
    : buys5m > 0
      ? buys5m
      : 0;

// Market evidence remains a contextual evidence layer.
// It does NOT replace the dedicated volume/liquidity scanners.

const marketStrength = Math.min(
  100,
  Math.max(
    0,
    (
      Math.min(100, marketLiquidity / 1000) *
      0.35
    ) +
    (
      Math.min(100, volume5m / 100) *
      0.30
    ) +
    (
      Math.min(
        100,
        marketBuySellRatio * 50
      ) * 0.20
    ) +
    (
      marketCap > 0 ? 15 : 0
    )
  )
);

addCanonicalEvidence("market", {
  confidenceContribution: marketStrength,
  confidenceWeight: 10,

  strengths:
    marketLiquidity > 0
      ? [
          "Active market liquidity is present",
        ]
      : [],

  weaknesses:
    marketLiquidity <= 0
      ? [
          "Market liquidity is unavailable",
        ]
      : [],

  risks:
    marketLiquidity > 0 &&
    marketLiquidity < 10000
      ? [
          "Liquidity is relatively thin",
        ]
      : [],

  assumptions:
    marketPrice > 0
      ? [
          "Current market price is available",
        ]
      : [],

  convictionDrivers:
    marketBuySellRatio > 1
      ? [
          "Buy pressure exceeds sell pressure",
        ]
      : [],

  monitoringPriorities: [
    "Monitor price, market cap and liquidity",
    "Monitor trading activity",
    "Monitor buy/sell pressure",
  ],

  invalidationCriteria:
    marketLiquidity > 0 &&
    marketLiquidity < 5000
      ? [
          "Severe liquidity deterioration",
        ]
      : [],
});


// =====================================================
// MOMENTUM EVIDENCE
// =====================================================

const momentumScore = Number(
  momentumData?.score ??
  momentumData?.momentumScore ??
  0
);

const momentumEvidence =
  momentumData?.evidence || {};

addCanonicalEvidence("momentum", {
  confidenceContribution:
    momentumEvidence.confidenceContribution ??
    momentumScore,

  confidenceWeight:
    momentumEvidence.confidenceWeight ??
    3,

  strengths:
    momentumData?.momentumStrength === "VERY_STRONG" ||
    momentumData?.momentumStrength === "STRONG"
      ? [
          "Momentum is accelerating",
        ]
      : momentumEvidence.strengths || [],

  weaknesses:
    momentumEvidence.weaknesses || [],

  risks:
    momentumEvidence.risks || [],

  assumptions:
    momentumEvidence.assumptions || [],

  convictionDrivers:
    momentumEvidence.convictionDrivers || [],

  monitoringPriorities:
    momentumEvidence.monitoringPriorities?.length
      ? momentumEvidence.monitoringPriorities
      : [
          "Monitor momentum continuation",
          "Monitor velocity breakout strength",
        ],

  invalidationCriteria:
    momentumEvidence.invalidationCriteria || [],
});


// =====================================================
// VOLUME EVIDENCE
// =====================================================

const volumeScore = Number(
  volumeAnalysis?.volumeScore ??
  volumeAnalysis?.score ??
  0
);

const volumeEvidence =
  volumeAnalysis?.evidence || {};

addCanonicalEvidence("volume", {
  confidenceContribution:
    volumeEvidence.confidenceContribution ??
    volumeScore,

  confidenceWeight:
    volumeEvidence.confidenceWeight ??
    4,

  strengths:
    volumeEvidence.strengths || [],

  weaknesses:
    volumeEvidence.weaknesses || [],

  risks:
    volumeEvidence.risks || [],

  assumptions:
    volumeEvidence.assumptions || [],

  convictionDrivers:
    volumeEvidence.convictionDrivers || [],

  monitoringPriorities:
    volumeEvidence.monitoringPriorities || [
      "Monitor volume continuation",
      "Monitor volume acceleration",
    ],

  invalidationCriteria:
    volumeEvidence.invalidationCriteria || [],
});


// =====================================================
// LIQUIDITY EVIDENCE
// =====================================================

const liquidityScore = Number(
  liquidityAnalysis?.liquidityScore ??
  liquidityAnalysis?.score ??
  0
);

const liquidityEvidence =
  liquidityAnalysis?.evidence || {};

addCanonicalEvidence("liquidity", {
  confidenceContribution:
    liquidityEvidence.confidenceContribution ??
    liquidityScore,

  confidenceWeight:
    liquidityEvidence.confidenceWeight ??
    5,

  strengths:
    liquidityEvidence.strengths || [],

  weaknesses:
    liquidityEvidence.weaknesses || [],

  risks:
    liquidityEvidence.risks || [],

  assumptions:
    liquidityEvidence.assumptions || [],

  convictionDrivers:
    liquidityEvidence.convictionDrivers || [],

  monitoringPriorities:
    liquidityEvidence.monitoringPriorities || [
      "Monitor liquidity stability",
      "Monitor liquidity deterioration",
    ],

  invalidationCriteria:
    liquidityEvidence.invalidationCriteria || [],
});


// =====================================================
// GENERAL WALLET INTELLIGENCE EVIDENCE
// =====================================================

const walletScore = Number(
  walletIntel?.score ??
  walletIntel?.walletScore ??
  0
);

const walletEvidence =
  walletIntel?.evidence || {};

addCanonicalEvidence("wallet", {
  confidenceContribution:
    walletEvidence.confidenceContribution ??
    walletScore,

  confidenceWeight:
    walletEvidence.confidenceWeight ??
    5,

  strengths:
    walletEvidence.strengths || [],

  weaknesses:
    walletEvidence.weaknesses || [],

  risks:
    walletEvidence.risks || [],

  assumptions:
    walletEvidence.assumptions || [],

  convictionDrivers:
    walletEvidence.convictionDrivers || [],

  monitoringPriorities:
    walletEvidence.monitoringPriorities || [
      "Monitor smart-wallet participation",
      "Monitor wallet behavior changes",
    ],

  invalidationCriteria:
    walletEvidence.invalidationCriteria || [],
});


// =====================================================
// PROFIT WALLET EVIDENCE
// =====================================================
//
// This is intentionally separate from "wallet".
// walletQualityScore is used by the historical matcher.

const profitWalletScore = Number(
  profitWalletData?.walletQualityScore || 0
);

addCanonicalEvidence("profitWallets", {
  confidenceContribution:
    profitWalletScore,

  confidenceWeight: 5,

  strengths:
    profitWalletData?.profitableWalletCount >= 8
      ? [
          "Strong profit-wallet presence detected",
        ]
      : [],

  weaknesses:
    profitWalletScore > 0 &&
    profitWalletScore < 40
      ? [
          "Profit-wallet quality is weak",
        ]
      : [],

  risks:
    profitWalletScore < 30
      ? [
          "Profit-wallet quality presents elevated risk",
        ]
      : [],

  convictionDrivers:
    profitWalletScore >= 70
      ? [
          "Higher-quality wallet participation supports the setup",
        ]
      : [],

  monitoringPriorities: [
    "Monitor profit-wallet participation",
    "Monitor wallet quality changes",
  ],

  invalidationCriteria:
    profitWalletScore < 20
      ? [
          "Profit-wallet quality deteriorates materially",
        ]
      : [],
});


// =====================================================
// MARKET INTEGRITY EVIDENCE
// =====================================================

const integrityScore = Number(
  integrityData?.score || 0
);

const integrityEvidence =
  integrityData?.evidence || {};

addCanonicalEvidence("integrity", {
  confidenceContribution:
    integrityEvidence.confidenceContribution ??
    integrityScore,

  confidenceWeight:
    integrityEvidence.confidenceWeight ??
    5,

  strengths:
    integrityEvidence.strengths ||
    (
      integrityScore >= 70 &&
      !integrityData?.artificialVolumeFlag &&
      !integrityData?.fakeMomentumFlag
        ? [
            "Market activity appears structurally healthy",
          ]
        : []
    ),

  weaknesses:
    integrityEvidence.weaknesses || [],

  risks:
    integrityEvidence.risks ||
    [
      ...(integrityData?.artificialVolumeFlag
        ? ["Artificial volume detected"]
        : []),

      ...(integrityData?.fakeMomentumFlag
        ? ["Potential fake momentum detected"]
        : []),
    ],

  assumptions:
    integrityEvidence.assumptions || [],

  convictionDrivers:
    integrityEvidence.convictionDrivers || [],

  monitoringPriorities:
    integrityEvidence.monitoringPriorities || [
      "Monitor market integrity",
      "Monitor artificial activity signals",
      "Monitor bundle behavior",
    ],

  invalidationCriteria:
    integrityEvidence.invalidationCriteria || [],
});


// =====================================================
// RUG-RISK EVIDENCE
// =====================================================

const rugRiskScore = Number(
  rugRiskData?.rugRiskScore || 0
);

const rugSafetyScore = Math.max(
  0,
  Math.min(100, 100 - rugRiskScore)
);

const rugEvidence =
  rugRiskData?.evidence || {};

addCanonicalEvidence("rugRisk", {
  confidenceContribution:
    rugEvidence.confidenceContribution ??
    rugSafetyScore,

  confidenceWeight:
    rugEvidence.confidenceWeight ??
    6,

  strengths:
    rugEvidence.strengths ||
    (
      rugRiskScore < 30
        ? [
            "Rug-risk indicators remain relatively low",
          ]
        : []
    ),

  weaknesses:
    rugEvidence.weaknesses ||
    (
      rugRiskScore >= 50
        ? [
            "Rug-risk indicators are elevated",
          ]
        : []
    ),

  risks:
    rugEvidence.risks ||
    (
      rugRiskScore >= 70
        ? [
            "High rug-risk conditions",
          ]
        : []
    ),

  assumptions:
    rugEvidence.assumptions || [],

  convictionDrivers:
    rugEvidence.convictionDrivers || [],

  monitoringPriorities:
    rugEvidence.monitoringPriorities || [
      "Monitor developer and liquidity behavior",
      "Monitor rug-risk indicators",
    ],

  invalidationCriteria:
    rugEvidence.invalidationCriteria || [],
});


// =====================================================
// RISK STRUCTURE EVIDENCE
// =====================================================

const structureScore = Number(
  riskStructureData?.structureConfidence ??
  0
);

const structureEvidence =
  riskStructureData?.evidence || {};

addCanonicalEvidence("riskStructure", {
  confidenceContribution:
    structureEvidence.confidenceContribution ??
    structureScore,

  confidenceWeight:
    structureEvidence.confidenceWeight ??
    5,

  strengths:
    structureEvidence.strengths || [],

  weaknesses:
    structureEvidence.weaknesses || [],

  risks:
    structureEvidence.risks || [],

  assumptions:
    structureEvidence.assumptions || [],

  convictionDrivers:
    structureEvidence.convictionDrivers || [],

  monitoringPriorities:
    structureEvidence.monitoringPriorities || [
      "Monitor funding clusters",
      "Monitor bundled-wallet behavior",
    ],

  invalidationCriteria:
    structureEvidence.invalidationCriteria || [],
});


// =====================================================
// HOLDER EVIDENCE
// =====================================================

const holderScore = Number(
  holderData?.score ??
  holderData?.decentralizationScore ??
  0
);

const holderEvidence =
  holderData?.evidence || {};

addCanonicalEvidence("holders", {
  confidenceContribution:
    holderEvidence.confidenceContribution ??
    holderScore,

  confidenceWeight:
    holderEvidence.confidenceWeight ??
    5,

  strengths:
    holderEvidence.strengths || [],

  weaknesses:
    holderEvidence.weaknesses || [],

  risks:
    holderEvidence.risks || [],

  assumptions:
    holderEvidence.assumptions || [],

  convictionDrivers:
    holderEvidence.convictionDrivers || [],

  monitoringPriorities:
    holderEvidence.monitoringPriorities || [
      "Monitor holder concentration",
      "Monitor large-wallet behavior",
    ],

  invalidationCriteria:
    holderEvidence.invalidationCriteria || [],
});


// =====================================================
// CHART EVIDENCE
// =====================================================

const chartTrendScore = Number(
  chartEntry?.metrics?.trendStrength || 0
);

addCanonicalEvidence("chart", {
  confidenceContribution:
    chartTrendScore,

  confidenceWeight: 8,

  strengths:
    chartTrendScore >= 70
      ? [
          "Chart structure supports continuation",
        ]
      : [],

  weaknesses:
    chartTrendScore > 0 &&
    chartTrendScore < 40
      ? [
          "Chart structure is weak",
        ]
      : [],

  risks:
    chartTrendScore < 30
      ? [
          "Chart structure does not strongly support entry",
        ]
      : [],

  convictionDrivers:
    chartTrendScore >= 70
      ? [
          "Technical trend remains supportive",
        ]
      : [],

  monitoringPriorities: [
    "Monitor chart structure",
    "Monitor breakout and pullback behavior",
  ],

  invalidationCriteria:
    chartTrendScore < 25
      ? [
          "Chart structure becomes materially bearish",
        ]
      : [],
});


// =====================================================
// CANONICAL EVIDENCE DEBUG
// =====================================================

console.log(
  "🧠 CANONICAL AI EVIDENCE",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(aiContext.evidence).map(
        ([key, value]) => [
          key,
          {
            confidenceContribution:
              value.confidenceContribution,

            confidenceWeight:
              value.confidenceWeight,

            strengths:
              value.strengths?.length || 0,

            weaknesses:
              value.weaknesses?.length || 0,

            risks:
              value.risks?.length || 0,

            convictionDrivers:
              value.convictionDrivers?.length || 0,
          },
        ]
      )
    ),
    null,
    2
  )
);

// =====================================================
// HISTORICAL PATTERN SCORING
// =====================================================

const signalScore =
  await scoreSignal({
    momentumScore:
      momentumData?.momentumScore,

    walletQualityScore:
      profitWalletData?.walletQualityScore,

    rugRiskScore:
      rugRiskData?.rugRiskScore,

    forecastScore:
      forecast?.forecastScore,

    context:
      aiContext,
  });

aiContext.analyses.signalScore =
  signalScore;

// =====================================================
// HISTORICAL MEMORY ENGINE
// =====================================================

const historicalMemory =
  await findSimilarPatterns({

    developerTrustScore:
      liquidityLock?.score ?? 0,

    consensus:
      signalScore?.consensus ?? 0,

    trustScore:
      signalScore?.trustScore ?? 0,

    forecastScore:
      forecast?.forecastScore ?? 0,

    chartScore:
      chartEntry?.metrics?.trendStrength ?? 0,

    momentumScore:
      momentumData?.momentumScore ?? 0,

    liquidityScore:
      liquidityAnalysis?.liquidityScore ?? 0,

    walletQualityScore:
      profitWalletData?.walletQualityScore ?? 0,

    holderSafetyScore:
      response?.evaluation?.score ?? 0,

  });

signalScore.rugRate =
    historicalMemory?.prediction?.rugProbability ?? 0;

signalScore.expectedROI =
    historicalMemory?.prediction?.expectedROI ?? 0;

signalScore.expectedPeakReturn =
    historicalMemory?.prediction?.expectedPeakReturn ?? 0;

signalScore.winRate =
    historicalMemory?.prediction?.winnerProbability ?? 0;

signalScore.moonshotRate =
    historicalMemory?.prediction?.moonshotProbability ?? 0;


aiContext.analyses.historicalMemory =
  historicalMemory;


// =====================================================
// HISTORICAL MEMORY EVIDENCE
// =====================================================

const historicalConfidence = Number(
  historicalMemory?.memoryConfidence ??
  historicalMemory?.sampleConfidence ??
  0
);

const historicalWinRate = Number(
  historicalMemory?.prediction?.winnerProbability ??
  0
);

addCanonicalEvidence("historical", {
  confidenceContribution:
    historicalConfidence,

  confidenceWeight: 8,

  strengths:
    historicalWinRate >= 70
      ? [
          "Historical pattern outcomes are favorable",
        ]
      : [],

  weaknesses:
    historicalConfidence > 0 &&
    historicalConfidence < 40
      ? [
          "Historical pattern confidence is limited",
        ]
      : [],

  risks:
    historicalWinRate < 40 &&
    historicalConfidence >= 50
      ? [
          "Historical pattern outcomes are unfavorable",
        ]
      : [],

  convictionDrivers:
    historicalWinRate >= 70
      ? [
          "Historical pattern memory supports the setup",
        ]
      : [],

  monitoringPriorities: [
    "Monitor historical pattern similarity",
    "Monitor prediction confidence",
  ],
});


// Store signal scoring
aiContext.analyses.signalScore =
  signalScore;

// Build AI recommendation
const aiRecommendation =
  buildAIRecommendation({
    historicalMemory,

    memoryProfile:
      historicalMemory?.memoryProfile,

    context: aiContext,

    forecast,

    signalScore,

    momentumData,

    profitWalletData,

    developerProfile,

    securityAnalysis: liquidityLock,

    volumeAnalysis,

    liquidityAnalysis,

    marketIntegrity: integrityData,

    holderSafety: response.evaluation,

    walletIntelligence: walletIntel,

    chartAnalysis: chartEntry,
  });

// Store recommendation
aiContext.analyses.aiRecommendation =
  aiRecommendation;

aiContext.recommendation =
  aiRecommendation;

aiContext.confidence =
  aiRecommendation?.confidence ?? 0;

scanStage(
  cleanWalletAddress,
  "AI_REASONING",
  95
);

console.log(
  "🧠 SIGNAL SCORE",
  JSON.stringify(
    signalScore,
    null,
    2
  )
);

// =====================================================
// SAVE HISTORICAL OUTCOME
// =====================================================

try {
  await saveTokenOutcome({
    tokenMint,
    walletAddress,

    market,
    holderData,
    walletIntel,
    profitWalletData,
    momentumData,
    integrityData,
    riskStructureData,
    rugRiskData,

    forecast,
    signalScore,

    aiRecommendation,
    aiContext,
  });
} catch (err) {
  console.error(
    "Failed to save TokenOutcome:",
    err
  );
}

const scanTimestamp =
  new Date().toISOString();

scanCompleted(
  cleanWalletAddress,
  {
    recommendation:
      aiRecommendation,

    confidence:
      aiContext.confidence,

    forecast,
    signalScore,

    evidence:
      aiContext.evidence,

    reasoning:
      aiContext.reasoning,

    investmentThesis:
      aiContext.investmentThesis,
  }
);

return {
  ok: true,

  walletAddress:
    cleanWalletAddress || null,

  tokenMint:
    cleanTokenMint,

  pairAddress:
    market.token.pairAddress,

  dexId:
    market.token.dexId,

  chainId:
    market.token.chainId,

  topHolders:
    holderData.topHolders || [],

  excludedAccounts:
    holderData.excludedAccounts || [],

  holderWarning:
    holderData.holderWarning || null,

  social:
    enrichedSocialData,

  activity:
    activityData,

  integrity:
    integrityData,

  rugRisk:
    rugRiskData,

  momentum:
    momentumData,

  riskStructure:
    riskStructureData,

  profitWallets:
    profitWalletData,

  volumeAnalysis,
  liquidityAnalysis,

  ai: {
    version: "v2",

    generatedAt:
      scanTimestamp,

    confidence:
      aiContext.confidence,

    recommendation:
      aiRecommendation,

    developer:
      developerProfile,

    developerWallet: {
      wallet:
        liquidityLock.developerWallet,

      balance:
        liquidityLock.developerBalance,

      knownAccounts:
        liquidityLock.developerKnownAccounts,

      creatorTokens:
        liquidityLock.developerTokens,
    },

    prediction: {
      winnerProbability:
        historicalMemory?.prediction
          ?.winnerProbability ?? 0,

      moonshotProbability:
        historicalMemory?.prediction
          ?.moonshotProbability ?? 0,

      rugProbability:
        historicalMemory?.prediction
          ?.rugProbability ?? 0,

      loserProbability:
        historicalMemory?.prediction
          ?.loserProbability ?? 0,

      expectedROI:
        historicalMemory?.prediction
          ?.expectedROI ?? 0,

      expectedPeakReturn:
        historicalMemory?.prediction
          ?.expectedPeakReturn ?? 0,

      confidence:
        historicalMemory?.memoryConfidence ?? 0,

      similarHistoricalScans:
        historicalMemory?.similarScans ?? 0,

      sampleConfidence:
        historicalMemory?.sampleConfidence ?? 0,

      similarityConfidence:
        historicalMemory?.similarityConfidence ?? 0,

      performanceConfidence:
        historicalMemory?.performanceConfidence ?? 0,
    },

    signalScore,

    forecast,

    analyses:
      aiContext.analyses,

    evidence:
      aiContext.evidence,

    reasoning:
      aiContext.reasoning,

    investmentThesis:
      aiContext.investmentThesis,
  },

  ...response,

  evaluation: {
    ...response.evaluation,

    warnings:
      mergedWarnings,
  },
};

  } catch (error) {
    console.error(
      "scanToken error:",
      error
    );

    scanFailed(
      cleanWalletAddress,
      error
    );

    throw error;
  }
}