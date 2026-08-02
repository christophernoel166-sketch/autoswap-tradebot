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

// =====================================================
// SCANNER TRUST WEIGHTS
// Total = 100
// =====================================================

const SCANNER_WEIGHTS = {

  security: 25,

  liquidity: 20,

  momentum: 15,

  wallet: 15,

  chart: 10,

  volume: 10,

  holder: 5,

};

const TOTAL_SCANNER_WEIGHT =
  Object.values(SCANNER_WEIGHTS)
    .reduce((a, b) => a + b, 0);


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
// NORMALIZED SCANNER SCORES
// Single source of truth for the entire application.
// =====================================================

const scannerScores = {

  momentum:
    Number(
      momentumData?.score ??
      momentumData?.momentumScore
    ) || 0,

  volume:
    Number(
      volumeAnalysis?.score ??
      volumeAnalysis?.volumeScore
    ) || 0,

  liquidity:
    Number(
      liquidityAnalysis?.score ??
      liquidityAnalysis?.liquidityScore
    ) || 0,

  security:
    Number(
      securityAnalysis?.score ??
      securityAnalysis?.securityScore ??
      securityAnalysis?.rugRiskScore
    ) || 0,

  wallet:
    Number(
      profitWalletData?.walletQualityScore
    ) || 0,

  holder:
    Number(
      holderSafety?.score ??
      holderSafety?.holderSafetyScore ??
      holderSafety?.evaluationScore
    ) || 0,

  chart:
    Number(
      chartAnalysis?.score ??
      chartAnalysis?.trendStrength ??
      chartAnalysis?.metrics?.trendStrength
    ) || 0,

};

const momentumScore = scannerScores.momentum;
const volumeScore = scannerScores.volume;
const liquidityScore = scannerScores.liquidity;
const securityScore = scannerScores.security;
const walletQuality = scannerScores.wallet;
const holderSafetyScore = scannerScores.holder;
const chartScore = scannerScores.chart;

const walletIntelligenceScore =
  Number(
    walletIntelligence?.score ??
    walletIntelligence?.walletIntelligenceScore
  ) || 0;

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
// Uses the global scanner weight table
// =====================================================

let weightedScore = 0;

for (const [scanner, score] of Object.entries(scannerScores)) {

  weightedScore +=
    (Number(score) / 100) *
    (SCANNER_WEIGHTS[scanner] ?? 0);

}

// Wallet Intelligence currently isn't part of scannerScores,
// so add it separately.

weightedScore +=
  (walletIntelligenceScore / 100) * 10;

let finalScore =
  Math.round(weightedScore);

// =====================================================
// SCANNER CONSENSUS
// =====================================================

const scannerVotes = {

  momentum:
    scannerScores.momentum >= 60,

  volume:
    scannerScores.volume >= 60,

  liquidity:
    scannerScores.liquidity >= 60,

  security:
    scannerScores.security >= 60,

  wallet:
    scannerScores.wallet >= 60,

  holder:
    scannerScores.holder >= 60,

  chart:
    scannerScores.chart >= 60,

};


// =====================================================
// TRUST SCORE
// =====================================================

let trustPoints = 0;

for (const [scanner, score] of Object.entries(scannerScores)) {

  const weight =
    SCANNER_WEIGHTS[scanner] ?? 0;

  trustPoints +=
    (Number(score) / 100) * weight;

}

const trustScore =
  Math.round(trustPoints);

// =====================================================
// WEIGHTED SCANNER CONSENSUS
// =====================================================

let positiveWeight = 0;

for (const [scanner, passed] of Object.entries(scannerVotes)) {

  if (passed) {

    positiveWeight +=
      SCANNER_WEIGHTS[scanner] ?? 0;

  }

}

const positiveVotes =
  Object.values(scannerVotes)
    .filter(Boolean)
    .length;

const totalVotes =
  Object.keys(scannerVotes)
    .length;

const consensus =
  Math.round(
    (positiveWeight / TOTAL_SCANNER_WEIGHT) * 100
  );


// =====================================================
// CONTRADICTION DETECTION
// =====================================================

const contradictions = [];

if (
  scannerScores.momentum >= 80 &&
  scannerScores.chart < 35
) {
  contradictions.push(
    "Momentum is strong but chart structure is weak."
  );
}

if (
  scannerScores.volume >= 80 &&
  scannerScores.liquidity < 40
) {
  contradictions.push(
    "High volume with weak liquidity."
  );
}

if (
  scannerScores.wallet >= 80 &&
  scannerScores.security < 40
) {
  contradictions.push(
    "Strong wallet activity but poor security."
  );
}

if (
  scannerScores.holder >= 80 &&
  scannerScores.security < 40
) {
  contradictions.push(
    "Healthy holders but dangerous contract."
  );
}

if (
  scannerScores.chart >= 80 &&
  scannerScores.momentum < 40
) {
  contradictions.push(
    "Chart setup exists but momentum is weak."
  );
}


if (contradictions.length > 0) {

  finalScore -= contradictions.length * 5;

}


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

// =====================================================
// AI CONFIDENCE ENGINE
// =====================================================

let confidence = finalScore;

// High Trust → Increase confidence
if (trustScore >= 90) {

  confidence += 10;

}
else if (trustScore >= 80) {

  confidence += 6;

}
else if (trustScore >= 70) {

  confidence += 3;

}
else if (trustScore < 40) {

  confidence -= 10;

}
else if (trustScore < 55) {

  confidence -= 5;

}


// Strong Consensus → Increase confidence

if (consensus >= 90) {

  confidence += 10;

}
else if (consensus >= 80) {

  confidence += 5;

}
else if (consensus < 40) {

  confidence -= 10;

}
else if (consensus < 60) {

  confidence -= 5;

}


// Contradictions reduce confidence

confidence -= contradictions.length * 5;


// Safety blockers destroy confidence

if (blockers.length > 0) {

  confidence = Math.min(confidence, 20);

}


// Clamp

confidence = Math.max(
  0,
  Math.min(100, Math.round(confidence))
);


const uniqueReasons = [...new Set(reasons)];
const uniqueBlockers = [...new Set(blockers)];

  // =====================================================
  // RETURN OBJECT
  // =====================================================

return {

  recommendation,

  confidence,

  finalScore,

  action: recommendation,

  explanation: uniqueReasons,

  reasoning: uniqueReasons,

  blockers: uniqueBlockers,

  scannerScores,

  scannerVotes,

  positiveVotes,

  consensus,

  trustScore,

  contradictions,

};

}