export async function fetchLiquidityAnalysisData({
  liquidityUsd,
}) {
  const liquidity =
    Number(liquidityUsd || 0);

  let liquidityScore = 20;
  let liquidityVerdict = "Very Low";

  if (liquidity >= 100000) {
    liquidityScore = 100;
    liquidityVerdict = "Excellent";
  } else if (liquidity >= 50000) {
    liquidityScore = 80;
    liquidityVerdict = "Strong";
  } else if (liquidity >= 20000) {
    liquidityScore = 60;
    liquidityVerdict = "Healthy";
  } else if (liquidity >= 10000) {
    liquidityScore = 40;
    liquidityVerdict = "Weak";
  }

  return {
    liquidityUsd: liquidity,
    liquidityScore,
    liquidityVerdict,
  };
}