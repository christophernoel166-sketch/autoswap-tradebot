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

export async function fetchLiquidityAnalysisData({
  liquidityUsd,
  previousLiquidityUsd = 0,
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

  return {
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
  };
}