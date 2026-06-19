function pushReason(reasons, condition, text) {
  if (condition) {
    reasons.push(text);
  }
}

export function buildAIRecommendation({
  forecast,
  signalScore,
  momentumData,
  profitWalletData,
  rugRiskData,
  volumeAnalysis,
  liquidityAnalysis,
}) {
  const reasons = [];

  const momentumScore =
    Number(momentumData?.momentumScore) || 0;

  const walletQuality =
    Number(
      profitWalletData?.walletQualityScore
    ) || 0;

  const rugRisk =
    Number(rugRiskData?.rugRiskScore);

  const forecastScore =
    Number(forecast?.forecastScore) || 0;

  pushReason(
    reasons,
    momentumScore >= 80,
    "Momentum is exceptionally strong."
  );

  pushReason(
    reasons,
    momentumScore >= 60 &&
      momentumScore < 80,
    "Momentum is above average."
  );

  pushReason(
    reasons,
    walletQuality >= 75,
    "High-quality wallets are participating."
  );

  pushReason(
    reasons,
    walletQuality >= 50 &&
      walletQuality < 75,
    "Wallet quality is reasonably healthy."
  );

  pushReason(
    reasons,
    Number.isFinite(rugRisk) &&
      rugRisk <= 20,
    "Rug risk appears very low."
  );

  pushReason(
    reasons,
    Number.isFinite(rugRisk) &&
      rugRisk >= 70,
    "Elevated rug risk detected."
  );

  pushReason(
    reasons,
    volumeAnalysis?.volumeVerdict ===
      "VERY_BULLISH",
    "Trading volume is exceptionally strong."
  );

  pushReason(
    reasons,
    liquidityAnalysis?.liquidityVerdict ===
      "VERY_STRONG",
    "Liquidity is very healthy."
  );

  if (signalScore?.matched) {
    reasons.push(
      `Matched historical pattern: ${signalScore.patternKey}.`
    );

    reasons.push(
      `Historical win rate: ${signalScore.historicalWinRate}%.`
    );

    reasons.push(
      `Historical samples: ${signalScore.historicalSamples}.`
    );
  } else {
    reasons.push(
      "No matching historical pattern found yet; recommendation is based primarily on live analysis."
    );
  }

  let action = "WATCH";

  if (forecastScore >= 90) {
    action = "STRONG_BUY";
  } else if (forecastScore >= 75) {
    action = "BUY";
  } else if (forecastScore >= 55) {
    action = "WATCH";
  } else {
    action = "AVOID";
  }

  if (signalScore?.recommendation) {
    action = signalScore.recommendation;
  }

  return {
    action,

    confidence:
      signalScore?.confidenceScore ??
      forecastScore,

    reasoning: reasons,
  };
}