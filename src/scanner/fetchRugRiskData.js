// src/scanner/fetchRugRiskData.js

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
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

  return {
    tokenMint,

    devDumpRiskScore,
    liquidityPullRiskScore,
    insiderRiskScore,

    rugRiskScore,
    rugRiskLevel,

    rugWarning: warnings.length ? warnings.join(" | ") : null,
  };
}