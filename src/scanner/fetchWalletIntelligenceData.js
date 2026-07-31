// src/scanner/fetchWalletIntelligenceData.js

/**
 * Wallet Intelligence Engine (Phase 1)
 *
 * This version uses:
 * - holder distribution
 * - concentration patterns
 * - simple heuristics
 *
 * Later upgrades:
 * - track profitable wallets
 * - historical PnL scoring
 * - cross-token wallet tracking
 */

// =========================================================
// AI Wallet Intelligence Helpers
// =========================================================

function getWalletQuality(score) {

  if (score >= 90) return "ELITE";

  if (score >= 75) return "STRONG";

  if (score >= 60) return "GOOD";

  if (score >= 40) return "AVERAGE";

  return "POOR";

}

function getSmartMoneyBias(
  smartDegens,
  snipers
) {

  const total =
    smartDegens + snipers;

  if (total >= 10)
    return "VERY_BULLISH";

  if (total >= 6)
    return "BULLISH";

  if (total >= 3)
    return "NEUTRAL";

  return "WEAK";

}

function getBotRisk(botCount) {

  if (botCount >= 20)
    return "EXTREME";

  if (botCount >= 10)
    return "HIGH";

  if (botCount >= 5)
    return "MODERATE";

  return "LOW";

}

function calculateWalletScore({

  smartDegens,

  snipers,

  bots,

  rats,

}) {

  let score = 50;

  score += smartDegens * 6;

  score += snipers * 4;

  score -= bots * 4;

  score -= rats * 2;

  return Math.max(
    0,
    Math.min(100, score)
  );

}


export async function fetchWalletIntelligenceData({
  tokenMint,
  holderData = {},
  market = {},
  context = {},
} = {}) {
  try {
    const warnings = [];

    const topHolders = holderData?.topHolders || [];

if (!Array.isArray(topHolders) || topHolders.length === 0) {
  return {

    score: 0,

    confidence: 0,

    verdict: {
      title: "No Wallet Data",
      level: "UNKNOWN",
      color: "gray",
      confidence: 0,
      summary: [
        "Wallet intelligence could not be evaluated."
      ],
    },

    smartDegenCount: 0,
    botDegenCount: 0,
    ratTraderCount: 0,
    sniperWalletCount: 0,

    walletScore: 0,
    walletQuality: "UNKNOWN",
    smartMoneyBias: "UNKNOWN",
    botRisk: "UNKNOWN",

    walletHealth: "UNKNOWN",
    smartMoneyConfidence: "UNKNOWN",

    walletIntelligenceWarning: "No holder data available",

    evidence: {
      confidenceContribution: 0,
      confidenceWeight: 5,
      strengths: [],
      weaknesses: [],
      risks: [],
      assumptions: [],
      convictionDrivers: [],
      monitoringPriorities: [],
    },

  };
}

    let smartDegenCount = 0;
    let botDegenCount = 0;
    let ratTraderCount = 0;
    let sniperWalletCount = 0;

    // ============================================
    // 🧠 BASIC WALLET CLASSIFICATION (HEURISTIC)
    // ============================================
    for (const holder of topHolders) {
      const percent = Number(holder?.percent || 0);

      // 🧠 Smart Degens (balanced holders)
      if (percent > 1 && percent < 5) {
        smartDegenCount++;
      }

      // 🤖 Bot-like wallets (tiny fragmented)
      if (percent > 0 && percent < 0.2) {
        botDegenCount++;
      }

      // 🐀 Rat traders (mid-range but suspicious clustering)
      if (percent >= 5 && percent <= 10) {
        ratTraderCount++;
      }

      // 🎯 Snipers (very early large entries)
      if (percent >= 10) {
        sniperWalletCount++;
      }
    }

    // ============================================
    // ⚠️ SANITY ADJUSTMENTS
    // ============================================
    if (sniperWalletCount > 10) {
      warnings.push("High sniper wallet concentration");
    }

    if (botDegenCount > smartDegenCount) {
      warnings.push("Bot activity outweighs smart money");
    }

    if (ratTraderCount > 5) {
      warnings.push("High rat trader presence");
    }

// =========================================================
// AI Wallet Intelligence
// =========================================================

const walletScore =
  calculateWalletScore({

    smartDegens:
      smartDegenCount,

    snipers:
      sniperWalletCount,

    bots:
      botDegenCount,

    rats:
      ratTraderCount,

  });

const walletQuality =
  getWalletQuality(
    walletScore
  );

const smartMoneyBias =
  getSmartMoneyBias(
    smartDegenCount,
    sniperWalletCount
  );

const botRisk =
  getBotRisk(
    botDegenCount
  );

// =========================================================
// AI Wallet Verdict
// =========================================================

let verdictTitle = "Average Wallet Quality";
let verdictLevel = "MEDIUM";
let verdictColor = "yellow";
let verdictConfidence = 60;

if (walletScore >= 85) {

  verdictTitle = "Elite Smart Money";
  verdictLevel = "LOW";
  verdictColor = "green";

  verdictConfidence =
    Math.min(
      99,
      65 +
      Math.round(walletScore * 0.30)
    );

}
else if (walletScore >= 65) {

  verdictTitle = "Healthy Wallet Activity";
  verdictLevel = "LOW_MEDIUM";
  verdictColor = "lime";

  verdictConfidence =
    Math.min(
      95,
      60 +
      Math.round(walletScore * 0.25)
    );

}
else if (walletScore >= 45) {

  verdictTitle = "Mixed Wallet Signals";
  verdictLevel = "MEDIUM";
  verdictColor = "yellow";

  verdictConfidence =
    Math.min(
      90,
      55 +
      Math.round(walletScore * 0.20)
    );

}
else {

  verdictTitle = "Weak Wallet Activity";
  verdictLevel = "HIGH";
  verdictColor = "red";

  verdictConfidence =
    Math.min(
      95,
      60 +
      Math.round((100 - walletScore) * 0.25)
    );

}

const verdict = {

  title: verdictTitle,

  level: verdictLevel,

  color: verdictColor,

  confidence: verdictConfidence,

  summary:
    warnings.length > 0
      ? warnings
      : [
          "Wallet activity appears healthy."
        ],

};

// =========================================================
// AI Evidence
// =========================================================

const evidence = {

  confidenceContribution:
    walletScore,

  confidenceWeight:
    5,

  strengths: [],

  weaknesses: [],

  risks: [],

  assumptions: [],

  convictionDrivers: [],

  monitoringPriorities: [],

};

// ---------------------------------------------------------
// Strengths
// ---------------------------------------------------------

if (
  walletQuality === "ELITE" ||
  walletQuality === "STRONG"
) {

  evidence.strengths.push(
    "Strong smart-money participation"
  );

}

if (
  smartMoneyBias === "VERY_BULLISH" ||
  smartMoneyBias === "BULLISH"
) {

  evidence.strengths.push(
    "Bullish wallet activity"
  );

}

// ---------------------------------------------------------
// Weaknesses
// ---------------------------------------------------------

if (
  walletQuality === "POOR"
) {

  evidence.weaknesses.push(
    "Weak wallet quality"
  );

}

// ---------------------------------------------------------
// Risks
// ---------------------------------------------------------

if (
  botRisk === "HIGH" ||
  botRisk === "EXTREME"
) {

  evidence.risks.push(
    "High bot activity detected"
  );

}

if (
  ratTraderCount >= 5
) {

  evidence.risks.push(
    "High rat trader concentration"
  );

}

// ---------------------------------------------------------
// Assumptions
// ---------------------------------------------------------

evidence.assumptions.push(
  "Smart wallets continue accumulating"
);

// ---------------------------------------------------------
// Conviction Drivers
// ---------------------------------------------------------

if (
  smartMoneyBias === "VERY_BULLISH"
) {

  evidence.convictionDrivers.push(
    "Exceptional smart-money participation"
  );

}

// ---------------------------------------------------------
// Monitoring Priorities
// ---------------------------------------------------------

evidence.monitoringPriorities.push(
  "Monitor smart-wallet activity"
);

evidence.monitoringPriorities.push(
  "Monitor bot participation"
);

// =========================================================
// Attach Evidence
// =========================================================

context.evidence ??= {};

context.evidence.wallets =
  evidence;

   return {

  // =======================================================
  // Existing Outputs (Backward Compatible)
  // =======================================================

  smartDegenCount,

  botDegenCount,

  ratTraderCount,

  sniperWalletCount,

  walletIntelligenceWarning:

    warnings.length > 0
      ? warnings.join(" | ")
      : null,

  // =======================================================
  // AI Intelligence
  // =======================================================

score: walletScore,

confidence: verdictConfidence,

verdict,

walletScore,

walletQuality,

smartMoneyBias,

botRisk,

  walletHealth:

    walletQuality === "ELITE" ||
    walletQuality === "STRONG"
      ? "HEALTHY"
      : "UNHEALTHY",

  smartMoneyConfidence:

    smartMoneyBias === "VERY_BULLISH"
      ? "HIGH"

      : smartMoneyBias === "BULLISH"
        ? "MEDIUM"

        : "LOW",

  // =======================================================
  // AI Evidence
  // =======================================================

  evidence,

};
  } catch (err) {
    console.error("fetchWalletIntelligenceData error:", err);

    return {

  score: 0,

  confidence: 0,

  verdict: {
    title: "Wallet Intelligence Failed",
    level: "UNKNOWN",
    color: "gray",
    confidence: 0,
    summary: [
      "Wallet intelligence could not be evaluated."
    ],
  },

  smartDegenCount: 0,
  botDegenCount: 0,
  ratTraderCount: 0,
  sniperWalletCount: 0,

  walletScore: 0,
  walletQuality: "UNKNOWN",
  smartMoneyBias: "UNKNOWN",
  botRisk: "UNKNOWN",

  walletHealth: "UNKNOWN",
  smartMoneyConfidence: "UNKNOWN",

  walletIntelligenceWarning: "Wallet intelligence failed",

  evidence: {
    confidenceContribution: 0,
    confidenceWeight: 5,
    strengths: [],
    weaknesses: [],
    risks: [],
    assumptions: [],
    convictionDrivers: [],
    monitoringPriorities: [],
  },

};
  }
}