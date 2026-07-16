function calculateGrowth(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  if (previousValue <= 0) {
    return 0;
  }

  return (
    ((currentValue - previousValue) /
      previousValue) *
    100
  );
}

// =========================================================
// AI Liquidity Intelligence Helpers
// =========================================================

function getLiquidityStrength(score) {

  if (score >= 90) return "VERY_STRONG";

  if (score >= 75) return "STRONG";

  if (score >= 60) return "HEALTHY";

  if (score >= 40) return "WEAK";

  return "VERY_WEAK";

}

function getLiquidityTrend(growth) {

  if (growth >= 100) return "EXPANDING";

  if (growth >= 30) return "GROWING";

  if (growth >= 0) return "STABLE";

  if (growth >= -20) return "DECLINING";

  return "DRAINING";

}

function getLiquidityRisk(liquidityUsd) {

  if (liquidityUsd >= 100000) return "LOW";

  if (liquidityUsd >= 50000) return "MODERATE";

  if (liquidityUsd >= 20000) return "HIGH";

  return "EXTREME";

}

function hasHealthyLiquidity(score) {

  return score >= 60;

}

export async function fetchLiquidityAnalysisData({
  liquidityUsd,
  previousLiquidityUsd = 0,
  context = {},
}) {

  const liquidity =
    Number(liquidityUsd || 0);

  const previousLiquidity =
    Number(previousLiquidityUsd || 0);

  // =========================
  // LIQUIDITY SIZE SCORE
  // =========================

  let liquiditySizeScore = 20;

  if (liquidity >= 100000) {
    liquiditySizeScore = 100;
  } else if (liquidity >= 50000) {
    liquiditySizeScore = 80;
  } else if (liquidity >= 20000) {
    liquiditySizeScore = 60;
  } else if (liquidity >= 10000) {
    liquiditySizeScore = 40;
  }

  // =========================
  // LIQUIDITY GROWTH
  // =========================

  const liquidityGrowth =
    calculateGrowth(
      liquidity,
      previousLiquidity
    );

  let growthScore = 50;

  if (liquidityGrowth >= 100) {
    growthScore = 100;
  } else if (liquidityGrowth >= 50) {
    growthScore = 90;
  } else if (liquidityGrowth >= 25) {
    growthScore = 80;
  } else if (liquidityGrowth >= 10) {
    growthScore = 70;
  } else if (liquidityGrowth >= 0) {
    growthScore = 50;
  } else if (liquidityGrowth >= -10) {
    growthScore = 40;
  } else {
    growthScore = 20;
  }

  // =========================
  // FINAL SCORE
  // =========================

  const liquidityScore =
    Math.round(
      liquiditySizeScore * 0.7 +
      growthScore * 0.3
    );

  let liquidityVerdict =
    "Weak";

  if (liquidityScore >= 90) {
    liquidityVerdict =
      "Excellent";
  } else if (
    liquidityScore >= 75
  ) {
    liquidityVerdict =
      "Strong";
  } else if (
    liquidityScore >= 60
  ) {
    liquidityVerdict =
      "Healthy";
  } else if (
    liquidityScore >= 40
  ) {
    liquidityVerdict =
      "Neutral";
  }

// =========================================================
// AI Liquidity Intelligence
// =========================================================

const liquidityStrength =
  getLiquidityStrength(
    liquidityScore
  );

const liquidityTrend =
  getLiquidityTrend(
    liquidityGrowth
  );

const liquidityRisk =
  getLiquidityRisk(
    liquidity
  );

const healthyLiquidity =
  hasHealthyLiquidity(
    liquidityScore
  );

// =========================================================
// AI Evidence
// =========================================================

const evidence = {

  confidenceContribution:
    liquidityScore,

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
  liquidityStrength === "VERY_STRONG" ||
  liquidityStrength === "STRONG"
) {

  evidence.strengths.push(
    "Liquidity is strong"
  );

}

if (healthyLiquidity) {

  evidence.strengths.push(
    "Healthy liquidity supports larger trades"
  );

}

if (
  liquidityTrend === "EXPANDING" ||
  liquidityTrend === "GROWING"
) {

  evidence.strengths.push(
    "Liquidity is increasing"
  );

}

// ---------------------------------------------------------
// Weaknesses
// ---------------------------------------------------------

if (
  liquidityStrength === "WEAK" ||
  liquidityStrength === "VERY_WEAK"
) {

  evidence.weaknesses.push(
    "Liquidity is weak"
  );

}

// ---------------------------------------------------------
// Risks
// ---------------------------------------------------------

if (
  liquidityRisk === "HIGH"
) {

  evidence.risks.push(
    "Limited liquidity may increase slippage"
  );

}

if (
  liquidityRisk === "EXTREME"
) {

  evidence.risks.push(
    "Very low liquidity increases rug risk"
  );

}

if (
  liquidityTrend === "DRAINING"
) {

  evidence.risks.push(
    "Liquidity is leaving the pool"
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

if (healthyLiquidity) {

  evidence.convictionDrivers.push(
    "Strong liquidity foundation"
  );

}

// ---------------------------------------------------------
// Monitoring Priorities
// ---------------------------------------------------------

evidence.monitoringPriorities.push(
  "Monitor liquidity growth"
);

evidence.monitoringPriorities.push(
  "Monitor liquidity withdrawals"
);

// =========================================================
// Attach Evidence
// =========================================================

if (
  context &&
  typeof context === "object"
) {

  context.evidence ??= {};

  context.evidence.liquidity =
    evidence;

}

 return {

  // =======================================================
  // Existing Outputs (Backward Compatible)
  // =======================================================

  liquidityUsd: liquidity,

  previousLiquidityUsd:
    previousLiquidity,

  liquidityGrowth:
    Number(
      liquidityGrowth.toFixed(2)
    ),

  liquiditySizeScore,

  growthScore,

  liquidityScore,

  liquidityVerdict,

  // =======================================================
  // AI Intelligence
  // =======================================================

  liquidityStrength,

  liquidityTrend,

  liquidityTrendConfidence:

    liquidityStrength === "VERY_STRONG"
      ? "HIGH"

      : liquidityStrength === "STRONG"
        ? "MEDIUM"

        : "LOW",

  liquidityRisk,

  healthyLiquidity,

  // =======================================================
  // AI Evidence
  // =======================================================

  evidence,

};
}