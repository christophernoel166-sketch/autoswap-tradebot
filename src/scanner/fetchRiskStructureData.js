// src/scanner/fetchRiskStructureData.js

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

// =========================================================
// AI Risk Structure Helpers
// =========================================================

function getBundleRisk(score) {

  if (score >= 8) return "EXTREME";

  if (score >= 6) return "HIGH";

  if (score >= 4) return "MODERATE";

  if (score >= 2) return "LOW";

  return "VERY_LOW";

}

function getFundingRisk(score) {

  if (score >= 7) return "EXTREME";

  if (score >= 5) return "HIGH";

  if (score >= 3) return "MODERATE";

  if (score >= 1) return "LOW";

  return "VERY_LOW";

}

function getStructureQuality({

  bundleScore,

  fundingClusterScore,

}) {

  const risk =
    bundleScore * 0.6 +
    fundingClusterScore * 0.4;

  if (risk <= 2)
    return "EXCELLENT";

  if (risk <= 4)
    return "GOOD";

  if (risk <= 6)
    return "AVERAGE";

  if (risk <= 8)
    return "POOR";

  return "VERY_POOR";

}

function calculateStructureConfidence({

  bundleScore,

  fundingClusterScore,

}) {

  const risk =
    bundleScore * 0.6 +
    fundingClusterScore * 0.4;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - risk * 10)
    )
  );

}

/**
 * Phase 1 risk-structure engine
 *
 * Uses:
 * - holder distribution
 * - top holder concentration
 * - repeated similar holder sizing
 * - early concentration patterns
 * - market/liquidity context
 *
 * Later upgrades can plug in:
 * - shared funding source detection
 * - on-chain wallet clustering
 * - synchronized buy timestamps
 */
export async function fetchRiskStructureData({
  tokenMint,
  market = {},
  holderData = {},
  context = {},
} = {}) {
  try {
    const warnings = [];

    const metrics = market?.metrics || {};
    const topHolders = safeArray(holderData?.topHolders);

    const ageMinutes = toNumber(metrics?.ageMinutes, 0);
    const liquidityUsd = toNumber(metrics?.liquidityUsd, 0);
    const volume5mUsd = toNumber(metrics?.volume5mUsd, 0);

    const largestHolderPercent = toNumber(
      holderData?.largestHolderPercent,
      0
    );
    const top10HoldingPercent = toNumber(
      holderData?.top10HoldingPercent,
      0
    );

    // ---------------------------------------------------
    // Bundled wallet heuristic
    // ---------------------------------------------------
    let bundledWalletCount = 0;

    if (topHolders.length > 1) {
      const percents = topHolders
        .map((h) => toNumber(h?.percent, 0))
        .filter((p) => p > 0);

      for (let i = 0; i < percents.length; i++) {
        for (let j = i + 1; j < percents.length; j++) {
          const a = percents[i];
          const b = percents[j];
          const diff = Math.abs(a - b);

          // similar-sized holders can indicate bundle/funding coordination
          if (a >= 0.5 && b >= 0.5 && diff <= 0.15) {
            bundledWalletCount++;
          }
        }
      }
    }

    bundledWalletCount = clamp(bundledWalletCount, 0, 20);

    // ---------------------------------------------------
    // Bundle score
    // ---------------------------------------------------
    let bundleScore = 0;

    if (bundledWalletCount >= 8) bundleScore += 5;
    else if (bundledWalletCount >= 5) bundleScore += 4;
    else if (bundledWalletCount >= 3) bundleScore += 3;
    else if (bundledWalletCount >= 1) bundleScore += 1;

    if (largestHolderPercent >= 4.5) bundleScore += 2;
    else if (largestHolderPercent >= 3.5) bundleScore += 1;

    if (top10HoldingPercent >= 25) bundleScore += 2;
    else if (top10HoldingPercent >= 20) bundleScore += 1;

    if (ageMinutes > 0 && ageMinutes <= 15 && bundledWalletCount >= 3) {
      bundleScore += 2;
      warnings.push("Early holder clustering detected");
    }

    bundleScore = clamp(Math.round(bundleScore), 0, 10);

    // ---------------------------------------------------
    // Funding cluster score (heuristic for now)
    // ---------------------------------------------------
    let fundingClusterScore = 0;

    if (bundledWalletCount >= 6) fundingClusterScore += 4;
    else if (bundledWalletCount >= 4) fundingClusterScore += 3;
    else if (bundledWalletCount >= 2) fundingClusterScore += 2;
    else if (bundledWalletCount >= 1) fundingClusterScore += 1;

    if (largestHolderPercent >= 4) fundingClusterScore += 1;
    if (top10HoldingPercent >= 22) fundingClusterScore += 1;

    if (
      liquidityUsd > 0 &&
      volume5mUsd > liquidityUsd * 1.5 &&
      bundledWalletCount >= 3
    ) {
      fundingClusterScore += 1;
      warnings.push("Activity may be supported by clustered wallets");
    }

    fundingClusterScore = clamp(Math.round(fundingClusterScore), 0, 10);

    // ---------------------------------------------------
    // Largest funding cluster proxy
    // ---------------------------------------------------
    let largestFundingCluster = 0;

    if (bundledWalletCount >= 8) largestFundingCluster = 5;
    else if (bundledWalletCount >= 6) largestFundingCluster = 4;
    else if (bundledWalletCount >= 4) largestFundingCluster = 3;
    else if (bundledWalletCount >= 2) largestFundingCluster = 2;
    else if (bundledWalletCount >= 1) largestFundingCluster = 1;

    if (largestFundingCluster >= 4) {
      warnings.push("Large coordinated wallet cluster suspected");
    } else if (largestFundingCluster >= 2) {
      warnings.push("Moderate wallet clustering detected");
    }

    // ---------------------------------------------------
    // Final warnings
    // ---------------------------------------------------
    if (bundleScore >= 7) {
      warnings.push("Bundle score is high");
    }

    if (fundingClusterScore >= 5) {
      warnings.push("Funding cluster score is elevated");
    }

// =========================================================
// AI Risk Structure Intelligence
// =========================================================

const bundleRisk =
  getBundleRisk(bundleScore);

const fundingRisk =
  getFundingRisk(fundingClusterScore);

const structureQuality =
  getStructureQuality({

    bundleScore,

    fundingClusterScore,

  });

const structureConfidence =
  calculateStructureConfidence({

    bundleScore,

    fundingClusterScore,

  });

// =========================================================
// AI Evidence
// =========================================================

const evidence = {

  confidenceContribution:
    structureConfidence,

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
  structureQuality === "EXCELLENT" ||
  structureQuality === "GOOD"
) {

  evidence.strengths.push(
    "Wallet structure appears healthy"
  );

}

if (
  bundleRisk === "VERY_LOW" ||
  bundleRisk === "LOW"
) {

  evidence.strengths.push(
    "Minimal coordinated wallet activity"
  );

}

if (
  fundingRisk === "VERY_LOW" ||
  fundingRisk === "LOW"
) {

  evidence.strengths.push(
    "Funding sources appear diversified"
  );

}

// ---------------------------------------------------------
// Weaknesses
// ---------------------------------------------------------

if (
  structureQuality === "POOR" ||
  structureQuality === "VERY_POOR"
) {

  evidence.weaknesses.push(
    "Wallet structure is concerning"
  );

}

// ---------------------------------------------------------
// Risks
// ---------------------------------------------------------

if (
  bundleRisk === "HIGH" ||
  bundleRisk === "EXTREME"
) {

  evidence.risks.push(
    "Potential bundled wallet activity"
  );

}

if (
  fundingRisk === "HIGH" ||
  fundingRisk === "EXTREME"
) {

  evidence.risks.push(
    "Funding cluster detected"
  );

}

if (
  largestFundingCluster >= 4
) {

  evidence.risks.push(
    "Large coordinated wallet cluster"
  );

}

// ---------------------------------------------------------
// Assumptions
// ---------------------------------------------------------

evidence.assumptions.push(
  "Wallet ownership remains stable"
);

// ---------------------------------------------------------
// Conviction Drivers
// ---------------------------------------------------------

if (
  structureQuality === "EXCELLENT"
) {

  evidence.convictionDrivers.push(
    "Excellent wallet distribution"
  );

}

// ---------------------------------------------------------
// Monitoring Priorities
// ---------------------------------------------------------

evidence.monitoringPriorities.push(
  "Monitor wallet clustering"
);

evidence.monitoringPriorities.push(
  "Monitor funding sources"
);

evidence.monitoringPriorities.push(
  "Monitor coordinated buying"
);

// =========================================================
// Attach Evidence
// =========================================================

if (
  context &&
  typeof context === "object"
) {

  context.evidence ??= {};

  context.evidence.structure =
    evidence;

}


return {

  // =======================================================
  // Existing Outputs (Backward Compatible)
  // =======================================================

  tokenMint:
    tokenMint || null,

  bundleScore,

  bundledWalletCount,

  fundingClusterScore,

  largestFundingCluster,

  riskStructureWarning:
    warnings.length
      ? [...new Set(warnings)].join(" | ")
      : null,

  // =======================================================
  // AI Intelligence
  // =======================================================

  bundleRisk,

  fundingRisk,

  structureQuality,

  structureConfidence,

  structureHealth:

    structureQuality === "EXCELLENT" ||
    structureQuality === "GOOD"
      ? "HEALTHY"
      : "UNHEALTHY",

  structureRisk:

    bundleRisk === "EXTREME" ||
    fundingRisk === "EXTREME"
      ? "EXTREME"

      : bundleRisk === "HIGH" ||
        fundingRisk === "HIGH"
      ? "HIGH"

      : bundleRisk === "MODERATE" ||
        fundingRisk === "MODERATE"
      ? "MODERATE"

      : "LOW",

  // =======================================================
  // AI Evidence
  // =======================================================

  evidence,

};


  } catch (err) {
    console.error("fetchRiskStructureData error:", err);

    return {

      tokenMint:
        tokenMint || null,

      bundleScore: 4,

      bundledWalletCount: 1,

      fundingClusterScore: 0,

      largestFundingCluster: 0,

      riskStructureWarning:
        "Risk structure scan failed",

      bundleRisk: "UNKNOWN",

      fundingRisk: "UNKNOWN",

      structureQuality: "UNKNOWN",

      structureConfidence: 0,

      structureHealth: "UNKNOWN",

      structureRisk: "UNKNOWN",

      evidence: {

        confidenceContribution: 0,

        confidenceWeight: 5,

        strengths: [],

        weaknesses: [],

        risks: [
          "Risk structure analysis failed"
        ],

        assumptions: [],

        convictionDrivers: [],

        monitoringPriorities: [],

      },

    };

  }

}