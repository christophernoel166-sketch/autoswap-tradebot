function pushReason(reasons, condition, text) {
  if (condition) {
    reasons.push(text);
  }
}

function mergeEvidence(reasons, blockers, evidence) {
  if (!evidence) return;

  if (Array.isArray(evidence.strengths)) {
    reasons.push(...evidence.strengths);
  }

  if (Array.isArray(evidence.warnings)) {
    reasons.push(...evidence.warnings);
  }

  if (Array.isArray(evidence.critical)) {
    blockers.push(...evidence.critical);
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
  signalScore,
  momentumData,
  profitWalletData,
  securityAnalysis,
  volumeAnalysis,
  liquidityAnalysis,

  // New AI inputs
  marketIntegrity,
  holderSafety,
  walletIntelligence,
  chartAnalysis,
}) {

  const reasons = [];
const blockers = [];

  // =====================================================
// STANDARDIZED SCANNER SCORES
// =====================================================



const momentumScore =
  Number(momentumData?.score ?? momentumData?.momentumScore) || 0;

const volumeScore =
  Number(volumeAnalysis?.score ?? volumeAnalysis?.volumeScore) || 0;

const liquidityScore =
  Number(liquidityAnalysis?.score ?? liquidityAnalysis?.liquidityScore) || 0;

// Existing services
const walletQuality =
  Number(profitWalletData?.walletQualityScore) || 0;



// New standardized scanners
const integrityScore =
  Number(marketIntegrity?.score) || 0;

const holderSafetyScore =
  Number(holderSafety?.score) || 0;

const walletIntelligenceScore =
  Number(walletIntelligence?.score) || 0;

const chartScore =
  Number(chartAnalysis?.score) || 0;

const securityScore =
  Number(securityAnalysis?.score) || 0;

// =====================================================
// MERGE SCANNER EVIDENCE
// =====================================================

mergeEvidence(
  reasons,
  blockers,
  momentumData?.evidence
);

mergeEvidence(
  reasons,
  blockers,
  volumeAnalysis?.evidence
);

mergeEvidence(
  reasons,
  blockers,
  liquidityAnalysis?.evidence
);

mergeEvidence(
  reasons,
  blockers,
  securityAnalysis?.evidence
);

mergeEvidence(
  reasons,
  blockers,
  marketIntegrity?.evidence
);

mergeEvidence(
  reasons,
  blockers,
  holderSafety?.evidence
);

mergeEvidence(
  reasons,
  blockers,
  walletIntelligence?.evidence
);

mergeEvidence(
  reasons,
  blockers,
  chartAnalysis?.evidence
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
// HISTORICAL PATTERN MESSAGES
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
// MASTER AI SCORE
// =====================================================

let finalScore = Math.round(
  momentumScore * 0.25 +
  volumeScore * 0.20 +
  securityScore * 0.20 +
  liquidityScore * 0.15 +
  walletIntelligenceScore * 0.10 +
  holderSafetyScore * 0.05 +
  chartScore * 0.05
);

// =====================================================
// AI SAFETY GATES
// =====================================================

if (securityScore < 35) {
  blockers.push(
    "Security analysis indicates a dangerous token."
  );
  finalScore = 0;
}

if (liquidityScore < 30) {
  blockers.push(
    "Liquidity is too weak to trade safely."
  );
  finalScore = 0;
}

if (momentumScore < 20) {
  blockers.push(
    "Momentum is too weak."
  );
  finalScore = Math.min(finalScore, 20);
}

if (chartScore > 0 && chartScore < 30) {
  blockers.push(
    "Chart structure does not support an entry."
  );
  finalScore = Math.min(finalScore, 30);
}





// =====================================================
// HISTORICAL LEARNING
// =====================================================

if (
  blockers.length === 0 &&
  signalScore?.matched &&
  Number.isFinite(signalScore?.confidenceScore)
) {
  const historicalScore = Number(
    signalScore.confidenceScore
  );

  finalScore = Math.round(
    finalScore * 0.7 +
    historicalScore * 0.3
  );
}

// =====================================================
// FINAL RECOMMENDATION
// =====================================================

let recommendation = getRecommendation(finalScore);

if (blockers.length > 0) {
  recommendation = "AVOID";
}


const uniqueReasons = [...new Set(reasons)];
const uniqueBlockers = [...new Set(blockers)];

  // =====================================================
  // RETURN OBJECT
  // =====================================================

return {
  recommendation,

  confidence: finalScore,

  explanation: uniqueReasons,

  reasoning: uniqueReasons,

  blockers: uniqueBlockers,

  action: recommendation,

  finalScore,
};

}