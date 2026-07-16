import PatternStats from "../../models/PatternStats.js";
import {
  scoreBucket,
  rugRiskBucket,
} from "../utils/patternBuckets.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRecommendation(score) {

  if (score >= 85) {
    return "STRONG_BUY";
  }

  if (score >= 70) {
    return "BUY";
  }

  if (score >= 55) {
    return "WATCH";
  }

  return "AVOID";

}

export async function scoreSignal({
  momentumScore,
  walletQualityScore,
  rugRiskScore,
  forecastScore = 0,
  context = {},
}) {

  const momentumBucket =
    scoreBucket(momentumScore);

  const walletBucket =
    scoreBucket(walletQualityScore);

  const rugBucket =
    rugRiskBucket(rugRiskScore);

  const patternKey = [
    momentumBucket,
    rugBucket,
    walletBucket,
  ].join("__");

  const stats = await PatternStats.findOne({
    key: patternKey,
  }).lean();

  const baseForecast =
    Number(forecastScore) || 0;

// =====================================================
// AI Evidence
// =====================================================

const evidence =
  context?.evidence || {};

const engines =
  Object.values(evidence);

let totalWeight = 0;
let weightedScore = 0;

for (const engine of engines) {

  if (!engine) continue;

  const contribution =
    Number(
      engine.confidenceContribution || 0
    );

  const weight =
    Number(
      engine.confidenceWeight || 0
    );

  weightedScore +=
    contribution * weight;

  totalWeight += weight;

}

const aiConfidence =
  Math.max(
    0,
    Math.min(
      100,
      totalWeight > 0
        ? Math.round(
            weightedScore /
            totalWeight
          )
        : baseForecast
    )
  );

// =====================================================
// AI Consensus
// =====================================================

const strengths = [];
const weaknesses = [];
const risks = [];
const convictionDrivers = [];
const monitoringPriorities = [];

for (const engine of engines) {

  if (!engine) continue;

  strengths.push(
    ...(engine.strengths || [])
  );

  weaknesses.push(
    ...(engine.weaknesses || [])
  );

  risks.push(
    ...(engine.risks || [])
  );

  convictionDrivers.push(
    ...(engine.convictionDrivers || [])
  );

  monitoringPriorities.push(
    ...(engine.monitoringPriorities || [])
  );

}

// No historical data yet.
if (!stats) {

  const recommendation =
    getRecommendation(
      aiConfidence
    );

  if (context && typeof context === "object") {

    context.recommendation =
      recommendation;

    context.confidence =
      aiConfidence;

    context.reasoning ??= {};

    context.reasoning.signalScore =
      aiConfidence;

    context.reasoning.patternMatched =
      false;

  }

  return {

    patternKey,

    matched: false,

    adjustedForecastScore:
      aiConfidence,

    confidenceScore: 0,

    historicalWinRate: 0,

    historicalSamples: 0,

   recommendation,

    signalScore:
      aiConfidence,

    aiConfidence,

    strengths:
      [...new Set(strengths)],

    weaknesses:
      [...new Set(weaknesses)],

    risks:
      [...new Set(risks)],

    convictionDrivers:
      [...new Set(convictionDrivers)],

    monitoringPriorities:
      [...new Set(monitoringPriorities)],

  };

}

  let adjusted =
  Math.round(
    baseForecast * 0.45 +
    aiConfidence * 0.55
  );

  if (
    stats.confidenceScore >= 80 &&
    stats.winRate >= 70
  ) {
    adjusted += 10;
  } else if (
    stats.confidenceScore >= 60 &&
    stats.winRate >= 55
  ) {
    adjusted += 5;
  } else if (
    stats.winRate < 40
  ) {
    adjusted -= 10;
  }

  adjusted = clamp(adjusted, 0, 100);

 const recommendation =
  getRecommendation(
    adjusted
  );

// =====================================================
// Save Final AI Decision
// =====================================================

if (context && typeof context === "object") {

  context.recommendation = recommendation;

  context.confidence = adjusted;

  context.reasoning ??= {};

  context.reasoning.signalScore =
    adjusted;

  context.reasoning.patternMatched =
    true;
context.reasoning.historicalAdjustment =
  adjusted - aiConfidence;

}


  return {
    matched: true,

    patternKey,

    adjustedForecastScore:
      adjusted,

    historicalWinRate:
      stats.winRate,

    confidenceScore:
      stats.confidenceScore,

    historicalSamples:
      stats.samples,

    recommendation,

   metadata:
  stats.metadata ?? {},

signalScore: adjusted,

aiConfidence,

historicalAdjustment:
  adjusted - aiConfidence,

strengths:
  [...new Set(strengths)],

weaknesses:
  [...new Set(weaknesses)],

risks:
  [...new Set(risks)],

convictionDrivers:
  [...new Set(convictionDrivers)],

monitoringPriorities:
  [...new Set(monitoringPriorities)],
  };
}