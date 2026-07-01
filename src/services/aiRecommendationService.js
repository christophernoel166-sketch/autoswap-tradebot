function pushReason(reasons, condition, text) {
  if (condition) {
    reasons.push(text);
  }
}

function getRecommendation(score) {
  if (score >= 85) {
    return "STRONG_BUY";
  }

  if (score >= 65) {
    return "BUY";
  }

  if (score >= 55) {
    return "CAUTION_BUY";
  }

  if (score >= 40) {
    return "WATCH";
  }

  return "AVOID";
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

  // =====================================================
  // MOMENTUM
  // =====================================================

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
    momentumScore > 0 &&
      momentumScore < 60,
    "Momentum is relatively weak."
  );

  // =====================================================
  // WALLET QUALITY
  // =====================================================

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
    walletQuality > 0 &&
      walletQuality < 50,
    "Wallet quality is below average."
  );

  // =====================================================
  // RUG RISK
  // =====================================================

  pushReason(
    reasons,
    Number.isFinite(rugRisk) &&
      rugRisk <= 20,
    "Rug risk appears very low."
  );

  pushReason(
    reasons,
    Number.isFinite(rugRisk) &&
      rugRisk > 20 &&
      rugRisk < 70,
    "Rug risk is moderate."
  );

  pushReason(
    reasons,
    Number.isFinite(rugRisk) &&
      rugRisk >= 70,
    "Elevated rug risk detected."
  );

  // =====================================================
  // VOLUME
  // =====================================================

  pushReason(
    reasons,
    volumeAnalysis?.volumeVerdict ===
      "VERY_BULLISH",
    "Trading volume is exceptionally strong."
  );

  pushReason(
    reasons,
    volumeAnalysis?.volumeVerdict ===
      "BULLISH",
    "Trading volume is healthy."
  );

  // =====================================================
  // LIQUIDITY
  // =====================================================

  pushReason(
    reasons,
    liquidityAnalysis?.liquidityVerdict ===
      "VERY_STRONG",
    "Liquidity is very healthy."
  );

  pushReason(
    reasons,
    liquidityAnalysis?.liquidityVerdict ===
      "STRONG",
    "Liquidity conditions are healthy."
  );

  // =====================================================
  // HISTORICAL PATTERN LEARNING
  // =====================================================

  if (signalScore?.matched) {
    reasons.push(
      `Matched historical pattern: ${signalScore.patternKey}.`
    );

    reasons.push(
      `Historical win rate: ${signalScore.historicalWinRate}%.`
    );

    reasons.push(
      `Based on ${signalScore.historicalSamples} historical samples.`
    );
  } else {
    reasons.push(
      "No matching historical pattern found yet; recommendation is based primarily on live analysis."
    );
  }

  // =====================================================
  // FINAL AI SCORE
  // =====================================================

  let finalScore = forecastScore;

  if (
    signalScore?.matched &&
    Number.isFinite(signalScore?.confidenceScore)
  ) {
    const historicalScore = Number(
      signalScore.confidenceScore
    );

    // Live market carries more weight than historical patterns
    finalScore = Math.round(
      forecastScore * 0.7 +
      historicalScore * 0.3
    );
  }

  const recommendation =
    getRecommendation(finalScore);

  // =====================================================
  // RETURN OBJECT
  // =====================================================

  return {
    recommendation,

    confidence: finalScore,

    explanation: reasons,

    reasoning: reasons,

    action: recommendation,

    finalScore,
  };
}