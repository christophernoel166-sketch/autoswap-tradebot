import TokenOutcome from "../../../models/TokenOutcome.js";

// =====================================================
// Feature Importance
// Total = 100
// =====================================================

const FEATURE_WEIGHTS = {

  developerTrust: 20,

  consensus: 15,

  trustScore: 15,

  forecast: 15,

  chart: 10,

  momentum: 10,

  liquidity: 10,

  wallet: 5,

  holder: 5,

};

const MIN_SIMILARITY = 60;

// =====================================================
// Compare two numeric values
// Returns 0 - 100
// =====================================================

function similarity(a, b) {

  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return 0;
  }

  return Math.max(
    0,
    100 - Math.abs(a - b)
  );

}

// =====================================================
// Weighted Similarity
// =====================================================

function calculateSimilarity(current, candidate) {

  let total = 0;

  total +=
    similarity(
      current.developerTrustScore,
      candidate.developerTrustScore
    ) * FEATURE_WEIGHTS.developerTrust;

  total +=
    similarity(
      current.consensus,
      candidate.consensus
    ) * FEATURE_WEIGHTS.consensus;

  total +=
    similarity(
      current.trustScore,
      candidate.trustScore
    ) * FEATURE_WEIGHTS.trustScore;

  total +=
    similarity(
      current.forecastScore,
      candidate.forecastScore
    ) * FEATURE_WEIGHTS.forecast;

  total +=
    similarity(
      current.chartScore,
      candidate.chartScore
    ) * FEATURE_WEIGHTS.chart;

  total +=
    similarity(
      current.momentumScore,
      candidate.momentumScore
    ) * FEATURE_WEIGHTS.momentum;

  total +=
    similarity(
      current.liquidityScore,
      candidate.liquidityScore
    ) * FEATURE_WEIGHTS.liquidity;

  total +=
    similarity(
      current.walletQualityScore,
      candidate.walletQualityScore
    ) * FEATURE_WEIGHTS.wallet;

  total +=
    similarity(
      current.holderSafetyScore,
      candidate.holderSafetyScore
    ) * FEATURE_WEIGHTS.holder;

  return Math.round(total / 100);

}

// =====================================================
// Outcome Weight
// Better historical outcomes have more influence
// =====================================================

function getOutcomeWeight(label) {

  switch (label) {

    case "MOONSHOT":
      return 1.30;

    case "WINNER":
      return 1.10;

    case "NEUTRAL":
      return 0.80;

    case "LOSER":
      return 0.45;

    case "RUG_OR_FAILURE":
      return 0.20;

    default:
      return 0.50;

  }

}

// =====================================================
// Recency Weight
// Recent trades matter more
// =====================================================

function getRecencyWeight(scannedAt) {

  if (!scannedAt) {

    return 0.50;

  }

  const ageDays =
    (Date.now() -
      new Date(scannedAt).getTime()) /
    86400000;

  if (ageDays <= 30) {

    return 1.00;

  }

  if (ageDays <= 90) {

    return 0.90;

  }

  if (ageDays <= 180) {

    return 0.75;

  }

  if (ageDays <= 365) {

    return 0.60;

  }

  return 0.40;

}

// =====================================================
// Final Memory Weight
// =====================================================

function calculateMemoryWeight(
  similarityScore,
  label,
  scannedAt
) {

  return (

    (similarityScore / 100)

    *

    getOutcomeWeight(label)

    *

    getRecencyWeight(scannedAt)

  );

}

// =====================================================
// Main
// =====================================================

export async function findSimilarPatterns(current) {

  const candidates =
    await TokenOutcome.find({

      trackingComplete: true,

      forecastScore: {

        $gte: current.forecastScore - 15,

        $lte: current.forecastScore + 15,

      },

      consensus: {

        $gte: current.consensus - 15,

        $lte: current.consensus + 15,

      },

    })
    .lean()
    .limit(500);

  const matches = [];

  for (const candidate of candidates) {

    const score =
      calculateSimilarity(
        current,
        candidate
      );

    if (score < MIN_SIMILARITY) {

      continue;

    }

  const memoryWeight =
  calculateMemoryWeight(
    score,
    candidate.label,
    candidate.scannedAt
  );

matches.push({

  similarity: score,

  memoryWeight,

  outcomeWeight:
    getOutcomeWeight(
      candidate.label
    ),

  recencyWeight:
    getRecencyWeight(
      candidate.scannedAt
    ),

  label:
    candidate.label,

  peakReturn:
    candidate.peakReturn ?? 0,

  roi:
    candidate.return24h ?? 0,

  developer:
    candidate.developerWallet,

  scannedAt:
    candidate.scannedAt,

  // Existing Scores

  forecast:
    candidate.forecastScore ?? 0,

  consensus:
    candidate.consensus ?? 0,

  trustScore:
    candidate.trustScore ?? 0,

  developerTrust:
    candidate.developerTrustScore ?? 0,

  momentum:
    candidate.momentumScore ?? 0,

  liquidity:
    candidate.liquidityScore ?? 0,

  wallet:
    candidate.walletQualityScore ?? 0,

  holder:
    candidate.holderSafetyScore ?? 0,

  chart:
    candidate.chartScore ?? 0,

});

  }

  if (matches.length === 0) {

    return {

      similarScans: 0,

      averageSimilarity: 0,

      winners: 0,

      moonshots: 0,

      rugs: 0,

      losers: 0,

      winRate: 0,

      moonshotRate: 0,

      rugRate: 0,

      averagePeakReturn: 0,

      averageROI: 0,

      confidence: 0,

      bestMatches: [],

    };

  }

  matches.sort(
    (a, b) =>
      b.similarity -
      a.similarity
  );

 // =====================================================
// MEMORY-WEIGHTED STATISTICS
// =====================================================

const winners =
  matches.filter(
    x => x.label === "WINNER"
  ).length;

const moonshots =
  matches.filter(
    x => x.label === "MOONSHOT"
  ).length;

const rugs =
  matches.filter(
    x =>
      x.label ===
      "RUG_OR_FAILURE"
  ).length;

const losers =
  matches.filter(
    x => x.label === "LOSER"
  ).length;

let totalMemoryWeight = 0;

let similaritySum = 0;

let peakReturnSum = 0;

let roiSum = 0;


let developerTrustSum = 0;

let consensusSum = 0;

let forecastSum = 0;

let trustScoreSum = 0;

let momentumSum = 0;

let liquiditySum = 0;

let walletSum = 0;

let holderSum = 0;

let chartSum = 0;


for (const match of matches) {

  totalMemoryWeight +=
    match.memoryWeight;

  similaritySum +=
    match.similarity *
    match.memoryWeight;

  peakReturnSum +=
    match.peakReturn *
    match.memoryWeight;

  roiSum +=
    match.roi *
    match.memoryWeight;

  developerTrustSum +=
    match.developerTrust *
    match.memoryWeight;

  consensusSum +=
    match.consensus *
    match.memoryWeight;

  forecastSum +=
    match.forecast *
    match.memoryWeight;

  trustScoreSum +=
    match.trustScore *
    match.memoryWeight;

  momentumSum +=
    match.momentum *
    match.memoryWeight;

  liquiditySum +=
    match.liquidity *
    match.memoryWeight;

  walletSum +=
    match.wallet *
    match.memoryWeight;

  holderSum +=
    match.holder *
    match.memoryWeight;

  chartSum +=
    match.chart *
    match.memoryWeight;

}

const averageSimilarity =
  totalMemoryWeight > 0
    ? Math.round(
        similaritySum /
        totalMemoryWeight
      )
    : 0;

const averagePeakReturn =
  totalMemoryWeight > 0
    ? Math.round(
        peakReturnSum /
        totalMemoryWeight
      )
    : 0;

const averageROI =
  totalMemoryWeight > 0
    ? Math.round(
        roiSum /
        totalMemoryWeight
      )
    : 0;

// =====================================================
// HISTORICAL WINNING PROFILE
// =====================================================

const memoryProfile = {

  developerTrust:
    totalMemoryWeight > 0
      ? Math.round(
          developerTrustSum /
          totalMemoryWeight
        )
      : 0,

  consensus:
    totalMemoryWeight > 0
      ? Math.round(
          consensusSum /
          totalMemoryWeight
        )
      : 0,

  forecast:
    totalMemoryWeight > 0
      ? Math.round(
          forecastSum /
          totalMemoryWeight
        )
      : 0,

  trustScore:
    totalMemoryWeight > 0
      ? Math.round(
          trustScoreSum /
          totalMemoryWeight
        )
      : 0,

  momentum:
    totalMemoryWeight > 0
      ? Math.round(
          momentumSum /
          totalMemoryWeight
        )
      : 0,

  liquidity:
    totalMemoryWeight > 0
      ? Math.round(
          liquiditySum /
          totalMemoryWeight
        )
      : 0,

  wallet:
    totalMemoryWeight > 0
      ? Math.round(
          walletSum /
          totalMemoryWeight
        )
      : 0,

  holder:
    totalMemoryWeight > 0
      ? Math.round(
          holderSum /
          totalMemoryWeight
        )
      : 0,

  chart:
    totalMemoryWeight > 0
      ? Math.round(
          chartSum /
          totalMemoryWeight
        )
      : 0,

};

// =====================================================
// MEMORY-WEIGHTED OUTCOME STATISTICS
// =====================================================

let winnerWeight = 0;

let moonshotWeight = 0;

let rugWeight = 0;

let loserWeight = 0;

for (const match of matches) {

  if (match.label === "WINNER") {

    winnerWeight +=
      match.memoryWeight;

  }

  if (match.label === "MOONSHOT") {

    moonshotWeight +=
      match.memoryWeight;

  }

  if (match.label === "RUG_OR_FAILURE") {

    rugWeight +=
      match.memoryWeight;

  }

  if (match.label === "LOSER") {

    loserWeight +=
      match.memoryWeight;

  }

}

const weightedWinRate =
  totalMemoryWeight > 0
    ? Math.round(
        (winnerWeight /
          totalMemoryWeight) *
        100
      )
    : 0;

const weightedMoonshotRate =
  totalMemoryWeight > 0
    ? Math.round(
        (moonshotWeight /
          totalMemoryWeight) *
        100
      )
    : 0;

const weightedRugRate =
  totalMemoryWeight > 0
    ? Math.round(
        (rugWeight /
          totalMemoryWeight) *
        100
      )
    : 0;

const weightedLoserRate =
  totalMemoryWeight > 0
    ? Math.round(
        (loserWeight /
          totalMemoryWeight) *
        100
      )
    : 0;



// =====================================================
// MEMORY CONFIDENCE SCORE
// =====================================================

// Confidence from sample size
const sampleConfidence =
  Math.min(
    matches.length / 200,
    1
  ) * 100;

// Confidence from similarity quality
const similarityConfidence =
  averageSimilarity;

// Confidence from historical performance
const performanceConfidence =
  Math.round(

    weightedWinRate * 0.60 +

    weightedMoonshotRate * 0.20 +

    (100 - weightedRugRate) * 0.20

  );

// Final Memory Confidence
const memoryConfidence =
  Math.round(

    similarityConfidence * 0.45 +

    performanceConfidence * 0.40 +

    sampleConfidence * 0.15

  );


// =====================================================
// EXPECTED OUTCOME PREDICTION
// =====================================================

const expectedPeakReturn =
  averagePeakReturn;

const expectedROI =
  averageROI;

const expectedWinnerProbability =
  weightedWinRate;

const expectedMoonshotProbability =
  weightedMoonshotRate;

const expectedRugProbability =
  weightedRugRate;

const expectedLoserProbability =
  weightedLoserRate;


  return {

    similarScans:
      matches.length,

    averageSimilarity,

    winners,

    moonshots,

    rugs,

    losers,

  winRate:
  weightedWinRate,

moonshotRate:
  weightedMoonshotRate,

rugRate:
  weightedRugRate,

loserRate:
  weightedLoserRate,

   averagePeakReturn,

averageROI,

confidence:
  memoryConfidence,

prediction: {

    expectedPeakReturn,

    expectedROI,

    winnerProbability:
      expectedWinnerProbability,

    moonshotProbability:
      expectedMoonshotProbability,

    rugProbability:
      expectedRugProbability,

    loserProbability:
      expectedLoserProbability,

},

memoryConfidence,

sampleConfidence,

similarityConfidence,

performanceConfidence,

memoryProfile,

bestMatches:
  matches.slice(0, 10),

  };

}