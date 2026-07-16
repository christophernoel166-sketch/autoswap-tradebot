// src/scanner/fetchMomentumData.js

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// =========================================================
// AI Intelligence Helpers
// =========================================================

function getMomentumStage(ageMinutes, momentumScore) {

  if (momentumScore < 30) return "FADING";

  if (ageMinutes <= 10) return "EARLY";

  if (ageMinutes <= 30) return "BUILDING";

  if (ageMinutes <= 120) return "ACCELERATING";

  if (ageMinutes <= 360) return "PEAK";

  return "EXHAUSTING";

}

function getMomentumStrength(score) {

  if (score >= 90) return "VERY_STRONG";

  if (score >= 75) return "STRONG";

  if (score >= 55) return "MODERATE";

  if (score >= 35) return "WEAK";

  return "VERY_WEAK";

}

function getBuyPressureLevel(ratio) {

  if (ratio >= 0.75) return "VERY_HIGH";

  if (ratio >= 0.65) return "HIGH";

  if (ratio >= 0.55) return "MODERATE";

  if (ratio >= 0.50) return "BALANCED";

  return "LOW";

}

function getBreakoutStrength(score) {

  if (score >= 85) return "STRONG";

  if (score >= 65) return "MODERATE";

  if (score >= 45) return "WEAK";

  return "NONE";

}

function getContinuationProbability(
  momentumScore,
  velocityBreakoutScore
) {

  return clamp(

    Math.round(
      momentumScore * 0.45 +
      velocityBreakoutScore * 0.55
    ),

    0,

    100

  );

}

export async function fetchMomentumData({
  tokenMint,
  market = {},
  context = {},
} = {}) {
  const warnings = [];
  const metrics = market?.metrics || {};

  const ageMinutes = toNumber(metrics.ageMinutes);
  const liquidityUsd = toNumber(metrics.liquidityUsd);
  const volume5mUsd = toNumber(metrics.volume5mUsd);
  const buys5m = toNumber(metrics.buys5m);
  const sells5m = toNumber(metrics.sells5m);

  const totalTx5m = buys5m + sells5m;
  const buyPressure =
    totalTx5m > 0 ? buys5m / totalTx5m : 0;

  let momentumScore = 0;
  let velocityBreakoutScore = 0;

  // =========================
  // MOMENTUM SCORE
  // =========================

  if (volume5mUsd >= 30000) momentumScore += 30;
  else if (volume5mUsd >= 20000) momentumScore += 24;
  else if (volume5mUsd >= 12000) momentumScore += 18;
  else if (volume5mUsd >= 5000) momentumScore += 10;
  else if (volume5mUsd >= 2000) momentumScore += 5;
  else warnings.push("Recent volume is weak");

  if (totalTx5m >= 250) momentumScore += 25;
  else if (totalTx5m >= 150) momentumScore += 20;
  else if (totalTx5m >= 80) momentumScore += 14;
  else if (totalTx5m >= 40) momentumScore += 8;
  else if (totalTx5m >= 20) momentumScore += 3;
  else warnings.push("Transaction flow is weak");

  if (buyPressure >= 0.7) momentumScore += 20;
  else if (buyPressure >= 0.62) momentumScore += 15;
  else if (buyPressure >= 0.55) momentumScore += 10;
  else if (buyPressure >= 0.5) momentumScore += 5;
  else warnings.push("Buy pressure is not strong");

  if (liquidityUsd >= 50000) momentumScore += 15;
  else if (liquidityUsd >= 30000) momentumScore += 10;
  else if (liquidityUsd >= 20000) momentumScore += 6;
  else if (liquidityUsd >= 15000) momentumScore += 3;
  else warnings.push("Liquidity is limiting momentum quality");

  if (ageMinutes >= 5 && ageMinutes <= 180) momentumScore += 10;
  else if (ageMinutes > 180 && ageMinutes <= 720) momentumScore += 6;
  else if (ageMinutes >= 3 && ageMinutes < 5) momentumScore += 3;
  else if (ageMinutes > 720) warnings.push("Momentum may be late-stage");

  momentumScore = clamp(Math.round(momentumScore), 0, 100);

  // =========================
  // VELOCITY BREAKOUT SCORE
  // =========================

  if (volume5mUsd >= 25000 && totalTx5m >= 150) {
    velocityBreakoutScore += 30;
  } else if (volume5mUsd >= 15000 && totalTx5m >= 100) {
    velocityBreakoutScore += 24;
  } else if (volume5mUsd >= 8000 && totalTx5m >= 60) {
    velocityBreakoutScore += 18;
  } else if (volume5mUsd >= 3000 && totalTx5m >= 25) {
    velocityBreakoutScore += 10;
  } else {
    warnings.push("Breakout velocity is weak");
  }

  if (buyPressure >= 0.72) velocityBreakoutScore += 25;
  else if (buyPressure >= 0.65) velocityBreakoutScore += 18;
  else if (buyPressure >= 0.58) velocityBreakoutScore += 12;
  else if (buyPressure >= 0.52) velocityBreakoutScore += 6;

  if (ageMinutes <= 30) velocityBreakoutScore += 20;
  else if (ageMinutes <= 90) velocityBreakoutScore += 14;
  else if (ageMinutes <= 180) velocityBreakoutScore += 8;
  else if (ageMinutes <= 360) velocityBreakoutScore += 4;

  if (liquidityUsd >= 30000) velocityBreakoutScore += 15;
  else if (liquidityUsd >= 20000) velocityBreakoutScore += 10;
  else if (liquidityUsd >= 15000) velocityBreakoutScore += 5;

  if (buys5m > sells5m * 1.5 && buys5m >= 50) {
    velocityBreakoutScore += 10;
  }

  velocityBreakoutScore = clamp(Math.round(velocityBreakoutScore), 0, 100);
// =========================================================
// AI Momentum Intelligence
// =========================================================

const momentumStage = getMomentumStage(
  ageMinutes,
  momentumScore
);

const momentumStrength = getMomentumStrength(
  momentumScore
);

const buyPressureLevel = getBuyPressureLevel(
  buyPressure
);

const breakoutDetected =
  velocityBreakoutScore >= 65;

const breakoutStrength = getBreakoutStrength(
  velocityBreakoutScore
);

const continuationProbability =
  getContinuationProbability(
    momentumScore,
    velocityBreakoutScore
  );

// =========================================================
// AI Evidence
// =========================================================

const evidence = {

  confidenceContribution: momentumScore,

  confidenceWeight: 3,

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

if (momentumStrength === "VERY_STRONG" || momentumStrength === "STRONG") {

  evidence.strengths.push(
    "Momentum is accelerating"
  );

}

if (buyPressureLevel === "VERY_HIGH" || buyPressureLevel === "HIGH") {

  evidence.strengths.push(
    "Strong buy pressure"
  );

}

if (breakoutDetected) {

  evidence.strengths.push(
    "Velocity breakout detected"
  );

}

if (continuationProbability >= 75) {

  evidence.strengths.push(
    "High probability of trend continuation"
  );

}

// ---------------------------------------------------------
// Weaknesses
// ---------------------------------------------------------

if (momentumStrength === "WEAK" || momentumStrength === "VERY_WEAK") {

  evidence.weaknesses.push(
    "Momentum is weak"
  );

}

if (buyPressureLevel === "LOW") {

  evidence.weaknesses.push(
    "Buying pressure is limited"
  );

}

// ---------------------------------------------------------
// Risks
// ---------------------------------------------------------

if (momentumStage === "PEAK") {

  evidence.risks.push(
    "Momentum may be approaching exhaustion"
  );

}

if (momentumStage === "EXHAUSTING") {

  evidence.risks.push(
    "Late-stage momentum increases reversal risk"
  );

}

// ---------------------------------------------------------
// Assumptions
// ---------------------------------------------------------

evidence.assumptions.push(
  "Buy pressure remains above selling pressure"
);

// ---------------------------------------------------------
// Conviction Drivers
// ---------------------------------------------------------

if (breakoutDetected) {

  evidence.convictionDrivers.push(
    "Breakout confirmation"
  );

}

if (momentumStrength === "VERY_STRONG") {

  evidence.convictionDrivers.push(
    "Exceptional momentum strength"
  );

}

// ---------------------------------------------------------
// Monitoring Priorities
// ---------------------------------------------------------

evidence.monitoringPriorities.push(
  "Monitor buy/sell pressure"
);

evidence.monitoringPriorities.push(
  "Monitor transaction velocity"
);
// =========================================================
// Attach Evidence To AI Context (if provided)
// =========================================================

if (context && typeof context === "object") {

  context.evidence ??= {};

  context.evidence.momentum = evidence;

}

  return {

  tokenMint: tokenMint || null,

  // =======================================================
  // Existing Outputs (Backward Compatible)
  // =======================================================

  momentumScore,

  velocityBreakoutScore,

  momentumWarning:

    warnings.length
      ? warnings.join(" | ")
      : null,

  // =======================================================
  // AI Intelligence
  // =======================================================

  momentumStage,

  momentumStrength,

  buyPressure: {

    ratio: Number(
      buyPressure.toFixed(3)
    ),

    level: buyPressureLevel,

  },

  breakoutDetected,

  breakoutStrength,

  continuationProbability,

  // =======================================================
  // AI Evidence
  // =======================================================

  evidence,

};
}