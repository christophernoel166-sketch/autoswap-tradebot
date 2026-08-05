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

// =====================================================
// HISTORICAL MEMORY COMPARISON
// =====================================================

function compareToHistorical(
  current,
  historical,
  label,
  reasons
) {

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(historical)
  ) {
    return;
  }

  const difference =
    current - historical;

  if (difference >= 10) {

    reasons.push(
      `${label} is ${difference} points stronger than historical winners.`
    );

  } else if (difference >= 5) {

    reasons.push(
      `${label} is slightly above the historical winning average.`
    );

  } else if (difference <= -10) {

    reasons.push(
      `${label} is ${Math.abs(difference)} points below historical winners.`
    );

  } else if (difference <= -5) {

    reasons.push(
      `${label} is slightly weaker than the historical winning average.`
    );

  } else {

    reasons.push(
      `${label} closely matches historical winning patterns.`
    );

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
memoryProfile,
  historicalMemory,
developerProfile,

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
// DEVELOPER INTELLIGENCE
// =====================================================

const developerTrust =
  Number(
    developerProfile?.trustScore
  ) || 0;

const developerWinRate =
  Number(
    developerProfile?.winRate
  ) || 0;

const developerRugRate =
  Number(
    developerProfile?.rugRate
  ) || 0;

const developerMoonshots =
  Number(
    developerProfile?.moonshots
  ) || 0;

const developerTokens =
  Number(
    developerProfile?.tokensCreated
  ) || 0;


// =====================================================
// AI MEMORY ENGINE
// =====================================================

const memoryConfidence =
  Number(
    historicalMemory?.memoryConfidence ??
    historicalMemory?.confidence
  ) || 0;

const historicalWinRate =
  Number(
    historicalMemory?.winRate
  ) || 0;

const historicalMoonshotRate =
  Number(
    historicalMemory?.moonshotRate
  ) || 0;

const historicalRugRate =
  Number(
    historicalMemory?.rugRate
  ) || 0;

const similarHistoricalScans =
  Number(
    historicalMemory?.similarScans
  ) || 0;


// =====================================================
// HISTORICAL PREDICTION
// =====================================================

const prediction =
  historicalMemory?.prediction ?? {};

const expectedROI =
  Number(
    prediction.expectedROI
  ) || 0;

const expectedPeakReturn =
  Number(
    prediction.expectedPeakReturn
  ) || 0;

const winnerProbability =
  Number(
    prediction.winnerProbability
  ) || 0;

const moonshotProbability =
  Number(
    prediction.moonshotProbability
  ) || 0;

const rugProbability =
  Number(
    prediction.rugProbability
  ) || 0;

const loserProbability =
  Number(
    prediction.loserProbability
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
// COMPARE TO HISTORICAL WINNING PROFILE
// =====================================================

if (memoryProfile) {

  compareToHistorical(
    scannerScores.momentum,
    memoryProfile.momentum,
    "Momentum",
    reasons
  );

  compareToHistorical(
    scannerScores.liquidity,
    memoryProfile.liquidity,
    "Liquidity",
    reasons
  );

  compareToHistorical(
    scannerScores.wallet,
    memoryProfile.wallet,
    "Wallet Quality",
    reasons
  );

  compareToHistorical(
    scannerScores.holder,
    memoryProfile.holder,
    "Holder Quality",
    reasons
  );

  compareToHistorical(
    scannerScores.chart,
    memoryProfile.chart,
    "Chart Structure",
    reasons
  );

  compareToHistorical(
    scannerScores.security,
    memoryProfile.trustScore,
    "Security",
    reasons
  );

}

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
// HISTORICAL PREDICTION SUMMARY
// =====================================================

if (similarHistoricalScans > 0) {

  reasons.push(
    `AI analyzed ${similarHistoricalScans} similar historical tokens.`
  );

  reasons.push(
    `Expected winner probability: ${winnerProbability}%.`
  );

  reasons.push(
    `Expected moonshot probability: ${moonshotProbability}%.`
  );

  reasons.push(
    `Expected rug probability: ${rugProbability}%.`
  );

  reasons.push(
    `Expected average ROI: ${expectedROI}%.`
  );

  reasons.push(
    `Expected peak return: ${expectedPeakReturn}%.`
  );

}

// =====================================================
// DEVELOPER INTELLIGENCE SUMMARY
// =====================================================

if (developerTokens > 0) {

  reasons.push(
    `Developer has launched ${developerTokens} previous token${developerTokens === 1 ? "" : "s"}.`
  );

  reasons.push(
    `Developer historical win rate: ${developerWinRate}%.`
  );

  reasons.push(
    `Developer rug rate: ${developerRugRate}%.`
  );

  if (developerMoonshots > 0) {
    reasons.push(
      `Developer previously launched ${developerMoonshots} moonshot token${developerMoonshots === 1 ? "" : "s"}.`
    );
  }

  if (developerTrust >= 85) {
    reasons.push(
      "Developer has an excellent historical trust score."
    );
  } else if (developerTrust >= 70) {
    reasons.push(
      "Developer has a strong historical reputation."
    );
  } else if (developerTrust >= 50) {
    reasons.push(
      "Developer has a mixed launch history."
    );
  } else {
    blockers.push(
      "Developer has a poor historical track record."
    );
  }

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

// ========================================
// AI MEMORY CONTRIBUTION
// ========================================

weightedScore +=
  (memoryConfidence / 100) * 15;

// Memory with many historical examples
// deserves a small additional bonus.

if (similarHistoricalScans >= 100) {

  weightedScore += 3;

}
else if (similarHistoricalScans >= 50) {

  weightedScore += 2;

}
else if (similarHistoricalScans >= 20) {

  weightedScore += 1;

}

// ========================================
// HISTORICAL PREDICTION CONTRIBUTION
// ========================================

// Historical winners increase score
weightedScore +=
  (winnerProbability / 100) * 8;

// Historical moonshots receive a smaller bonus
weightedScore +=
  (moonshotProbability / 100) * 5;

// Historical rugs reduce confidence
weightedScore -=
  (rugProbability / 100) * 10;

// Strong expected ROI deserves a bonus
if (expectedROI >= 100) {

  weightedScore += 5;

}
else if (expectedROI >= 50) {

  weightedScore += 3;

}
else if (expectedROI >= 20) {

  weightedScore += 1;

}

// ========================================
// DEVELOPER INTELLIGENCE CONTRIBUTION
// ========================================

// Strong developer trust
weightedScore +=
  (developerTrust / 100) * 8;

// Successful launch history
weightedScore +=
  (developerWinRate / 100) * 6;

// Previous moonshots
weightedScore +=
  Math.min(developerMoonshots, 5);

// Rug history reduces score
weightedScore -=
  (developerRugRate / 100) * 8;

// Developers with many launches get
// a small reliability bonus.

if (developerTokens >= 50) {

  weightedScore += 4;

}
else if (developerTokens >= 20) {

  weightedScore += 3;

}
else if (developerTokens >= 10) {

  weightedScore += 2;

}
else if (developerTokens >= 5) {

  weightedScore += 1;

}

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

// =====================================================
// DEVELOPER CONFIDENCE
// =====================================================

if (developerTokens >= 5) {

  confidence += 2;

}

if (developerTokens >= 20) {

  confidence += 2;

}

if (developerTrust >= 80) {

  confidence += 5;

}
else if (developerTrust >= 65) {

  confidence += 3;

}
else if (developerTrust <= 30) {

  confidence -= 5;

}

if (developerWinRate >= 75) {

  confidence += 4;

}
else if (developerWinRate >= 60) {

  confidence += 2;

}
else if (developerWinRate <= 30) {

  confidence -= 4;

}

if (developerRugRate >= 40) {

  confidence -= 6;

}
else if (developerRugRate >= 20) {

  confidence -= 3;

}

if (developerMoonshots >= 3) {

  confidence += 3;

}

// =====================================================
// MEMORY CONFIDENCE
// =====================================================

if (memoryConfidence >= 90) {

  confidence += 10;

}
else if (memoryConfidence >= 80) {

  confidence += 7;

}
else if (memoryConfidence >= 70) {

  confidence += 4;

}
else if (memoryConfidence >= 60) {

  confidence += 2;

}
else if (memoryConfidence < 30) {

  confidence -= 10;

}
else if (memoryConfidence < 50) {

  confidence -= 5;

}

// =====================================================
// SAMPLE SIZE CONFIDENCE
// =====================================================

if (similarHistoricalScans >= 500) {

  confidence += 10;

}
else if (similarHistoricalScans >= 250) {

  confidence += 7;

}
else if (similarHistoricalScans >= 100) {

  confidence += 5;

}
else if (similarHistoricalScans >= 50) {

  confidence += 3;

}
else if (similarHistoricalScans >= 20) {

  confidence += 1;

}
else if (similarHistoricalScans < 5) {

  confidence -= 5;

}

// =====================================================
// HISTORICAL PERFORMANCE
// =====================================================

if (historicalWinRate >= 80) {

  confidence += 6;

}
else if (historicalWinRate >= 70) {

  confidence += 4;

}
else if (historicalWinRate >= 60) {

  confidence += 2;

}

if (historicalMoonshotRate >= 20) {

  confidence += 4;

}
else if (historicalMoonshotRate >= 10) {

  confidence += 2;

}

if (historicalRugRate >= 40) {

  confidence -= 10;

}
else if (historicalRugRate >= 25) {

  confidence -= 6;

}
else if (historicalRugRate >= 15) {

  confidence -= 3;

}

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