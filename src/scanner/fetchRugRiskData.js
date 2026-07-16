// src/scanner/fetchRugRiskData.js

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

// =========================================================
// AI Rug Risk Helpers
// =========================================================

function getRiskLevel(score) {

  if (score >= 85) return "EXTREME";

  if (score >= 70) return "HIGH";

  if (score >= 50) return "MODERATE";

  if (score >= 30) return "LOW";

  return "VERY_LOW";

}

function getEntrySafety(score) {

  if (score <= 20) return "SAFE";

  if (score <= 40) return "CAUTION";

  if (score <= 60) return "HIGH_RISK";

  return "DO_NOT_ENTER";

}

function getRugProbability(score) {

  if (score >= 80) return "VERY_HIGH";

  if (score >= 60) return "HIGH";

  if (score >= 40) return "MODERATE";

  if (score >= 20) return "LOW";

  return "VERY_LOW";

}

/**
 * Rug risk detection (first version)
 *
 * Inputs:
 * - market.metrics
 * - holderData
 * - context (optional future use)
 */
export async function fetchRugRiskData({
  tokenMint,
  market = {},
  holderData = {},
  context = {},
} = {}) {
  const warnings = [];

  const metrics = market?.metrics || {};

  const liquidityUsd = toNumber(metrics.liquidityUsd);
  const volume5mUsd = toNumber(metrics.volume5mUsd);
  const ageMinutes = toNumber(metrics.ageMinutes);

  const largestHolder = toNumber(holderData?.largestHolderPercent);
  const top10 = toNumber(holderData?.top10HoldingPercent);

  let devDumpRiskScore = 0;
  let liquidityPullRiskScore = 0;
  let insiderRiskScore = 0;

  // ---------------------------------------------------
  // DEV DUMP HEURISTICS
  // ---------------------------------------------------
  if (largestHolder >= 15) {
    devDumpRiskScore += 25;
    warnings.push("Large holder may be capable of dumping");
  }

  if (largestHolder >= 20) {
    devDumpRiskScore += 20;
  }

  if (top10 >= 35) {
    devDumpRiskScore += 15;
  }

  if (ageMinutes <= 10 && volume5mUsd >= 15000 && largestHolder >= 12) {
    devDumpRiskScore += 10;
    warnings.push("Early high activity with strong holder control");
  }

  // ---------------------------------------------------
  // LIQUIDITY RISK
  // ---------------------------------------------------
  if (liquidityUsd < 20000) {
    liquidityPullRiskScore += 20;
    warnings.push("Liquidity is relatively low");
  }

  if (liquidityUsd < 15000) {
    liquidityPullRiskScore += 25;
  }

  if (volume5mUsd > liquidityUsd * 1.5) {
    liquidityPullRiskScore += 20;
    warnings.push("Volume is high relative to liquidity");
  }

  if (volume5mUsd > liquidityUsd * 2) {
    liquidityPullRiskScore += 15;
  }

  // ---------------------------------------------------
  // INSIDER CONTROL RISK
  // ---------------------------------------------------
  if (top10 >= 40) {
    insiderRiskScore += 25;
    warnings.push("Top holders control a large share");
  }

  if (top10 >= 50) {
    insiderRiskScore += 20;
  }

  if (largestHolder >= 18 && top10 >= 35) {
    insiderRiskScore += 15;
  }

  // ---------------------------------------------------
  // FINAL SCORES
  // ---------------------------------------------------
  devDumpRiskScore = clamp(devDumpRiskScore, 0, 100);
  liquidityPullRiskScore = clamp(liquidityPullRiskScore, 0, 100);
  insiderRiskScore = clamp(insiderRiskScore, 0, 100);

  const rugRiskScore = clamp(
    Math.round(
      devDumpRiskScore * 0.4 +
      liquidityPullRiskScore * 0.35 +
      insiderRiskScore * 0.25
    ),
    0,
    100
  );

  const rugRiskLevel =
    rugRiskScore >= 75
      ? "HIGH"
      : rugRiskScore >= 55
      ? "ELEVATED"
      : rugRiskScore >= 35
      ? "MODERATE"
      : "LOW";

// =========================================================
// AI Rug Intelligence
// =========================================================

const overallRiskLevel =
  getRiskLevel(rugRiskScore);

const rugProbability =
  getRugProbability(rugRiskScore);

const entrySafety =
  getEntrySafety(rugRiskScore);

// =========================================================
// AI Evidence
// =========================================================

const evidence = {

  confidenceContribution:
    100 - rugRiskScore,

  confidenceWeight:
    6,

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
  rugRiskScore <= 25
) {

  evidence.strengths.push(
    "Low rug risk detected"
  );

}

if (
  liquidityPullRiskScore <= 20
) {

  evidence.strengths.push(
    "Liquidity appears stable"
  );

}

if (
  insiderRiskScore <= 20
) {

  evidence.strengths.push(
    "Holder concentration is acceptable"
  );

}

// ---------------------------------------------------------
// Weaknesses
// ---------------------------------------------------------

if (
  rugRiskScore >= 50
) {

  evidence.weaknesses.push(
    "Elevated rug risk"
  );

}

if (
  devDumpRiskScore >= 40
) {

  evidence.weaknesses.push(
    "Developer dump risk is elevated"
  );

}

// ---------------------------------------------------------
// Risks
// ---------------------------------------------------------

if (
  liquidityPullRiskScore >= 40
) {

  evidence.risks.push(
    "Liquidity removal risk"
  );

}

if (
  insiderRiskScore >= 40
) {

  evidence.risks.push(
    "Insider concentration risk"
  );

}

if (
  devDumpRiskScore >= 40
) {

  evidence.risks.push(
    "Developer-controlled supply"
  );

}

// ---------------------------------------------------------
// Assumptions
// ---------------------------------------------------------

evidence.assumptions.push(
  "Liquidity remains available"
);

// ---------------------------------------------------------
// Conviction Drivers
// ---------------------------------------------------------

if (
  rugRiskScore <= 20
) {

  evidence.convictionDrivers.push(
    "Very low structural rug risk"
  );

}

// ---------------------------------------------------------
// Monitoring Priorities
// ---------------------------------------------------------

evidence.monitoringPriorities.push(
  "Monitor liquidity"
);

evidence.monitoringPriorities.push(
  "Monitor whale wallets"
);

evidence.monitoringPriorities.push(
  "Monitor holder concentration"
);

// =========================================================
// Attach Evidence
// =========================================================

if (
  context &&
  typeof context === "object"
) {

  context.evidence ??= {};

  context.evidence.risk =
    evidence;

}


return {

  // =======================================================
  // Existing Outputs (Backward Compatible)
  // =======================================================

  tokenMint,

  devDumpRiskScore,

  liquidityPullRiskScore,

  insiderRiskScore,

  rugRiskScore,

  rugRiskLevel,

  rugWarning:

    warnings.length
      ? warnings.join(" | ")
      : null,

  // =======================================================
  // AI Intelligence
  // =======================================================

  overallRiskLevel,

  rugProbability,

  entrySafety,

  safeToEnter:
    rugRiskScore <= 40,

  riskBreakdown: {

    developer:
      devDumpRiskScore,

    liquidity:
      liquidityPullRiskScore,

    insider:
      insiderRiskScore,

  },

  // =======================================================
  // AI Evidence
  // =======================================================

  evidence,

};
}