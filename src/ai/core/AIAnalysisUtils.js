// =====================================================
// AI ANALYSIS UTILITIES
// These functions contain AI reasoning logic.
// They are used by the Position Intelligence Engine.
// =====================================================

import {
  normalizeScore,
  normalizeConfidence,
  safeNumber,
  percentChange,
} from "./AIUtils.js";

import {
  POSITION_HEALTH,
  AI_TREND,
  AI_RECOMMENDATION,
} from "./AIConfig.js";

// =====================================================
// Calculate Trend
// =====================================================

export function calculateTrend(previous, current) {

  previous = safeNumber(previous);

  current = safeNumber(current);

  const difference = current - previous;

  if (difference >= 15)
    return AI_TREND.STRONGLY_IMPROVING;

  if (difference >= 5)
    return AI_TREND.IMPROVING;

  if (difference <= -15)
    return AI_TREND.STRONGLY_WEAKENING;

  if (difference <= -5)
    return AI_TREND.WEAKENING;

  return AI_TREND.STABLE;

}

// =====================================================
// Health Category
// =====================================================

export function calculateHealthCategory(score) {

  score = normalizeScore(score);

  if (score >= POSITION_HEALTH.EXCELLENT.min)
    return "EXCELLENT";

  if (score >= POSITION_HEALTH.HEALTHY.min)
    return "HEALTHY";

  if (score >= POSITION_HEALTH.WEAKENING.min)
    return "WEAKENING";

  if (score >= POSITION_HEALTH.HIGH_RISK.min)
    return "HIGH_RISK";

  if (score >= POSITION_HEALTH.CRITICAL.min)
    return "CRITICAL";

  return "EXIT";

}

// =====================================================
// Detect Recovery
// =====================================================

export function detectRecovery(previousHealth, currentHealth) {

  previousHealth = safeNumber(previousHealth);

  currentHealth = safeNumber(currentHealth);

  const improvement = currentHealth - previousHealth;

  return {

    recovered: improvement >= 10,

    improvement,

    trend: calculateTrend(previousHealth, currentHealth),

  };

}

// =====================================================
// Calculate Adaptive Protection
// =====================================================

export function calculateProtectionDistance(health) {

  health = normalizeScore(health);

  if (health >= 90) return 10;

  if (health >= 80) return 8;

  if (health >= 70) return 6;

  if (health >= 60) return 5;

  if (health >= 50) return 4;

  if (health >= 40) return 3;

  if (health >= 30) return 2;

  return 1;

}

// =====================================================
// AI Recommendation
// =====================================================

export function calculateRecommendation(health) {

  health = normalizeScore(health);

  if (health >= 90)
    return AI_RECOMMENDATION.STRONG_HOLD;

  if (health >= 75)
    return AI_RECOMMENDATION.HOLD;

  if (health >= 60)
    return AI_RECOMMENDATION.WATCH;

  if (health >= 40)
    return AI_RECOMMENDATION.PROTECT;

  if (health >= 20)
    return AI_RECOMMENDATION.REDUCE_RISK;

  return AI_RECOMMENDATION.EXIT;

}

// =====================================================
// Confidence Adjustment
// =====================================================

export function adjustConfidence(baseConfidence, penalties = []) {

  let confidence = normalizeConfidence(baseConfidence);

  for (const penalty of penalties) {

    confidence -= safeNumber(penalty);

  }

  return normalizeConfidence(confidence);

}

// =====================================================
// Calculate Health Delta
// =====================================================

export function calculateHealthDelta(previous, current) {

  return {

    previous,

    current,

    delta: current - previous,

    percent: percentChange(previous, current),

    trend: calculateTrend(previous, current),

  };

}