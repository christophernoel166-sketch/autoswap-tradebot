// =====================================================
// AI UTILITY FUNCTIONS
// Pure helper functions used across every AI engine.
// =====================================================

// -----------------------------------------------------
// Clamp number between min/max
// -----------------------------------------------------

export function clamp(value, min = 0, max = 100) {

  if (value === null || value === undefined || isNaN(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Number(value)));

}

// -----------------------------------------------------
// Safe Number
// -----------------------------------------------------

export function safeNumber(value, fallback = 0) {

  const num = Number(value);

  return Number.isFinite(num)
    ? num
    : fallback;

}

// -----------------------------------------------------
// Safe Boolean
// -----------------------------------------------------

export function safeBoolean(value) {

  return Boolean(value);

}

// -----------------------------------------------------
// Round Number
// -----------------------------------------------------

export function round(value, decimals = 2) {

  const factor = 10 ** decimals;

  return Math.round(safeNumber(value) * factor) / factor;

}

// -----------------------------------------------------
// Average
// -----------------------------------------------------

export function average(values = []) {

  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) => sum + safeNumber(value),
    0
  );

  return total / values.length;

}

// -----------------------------------------------------
// Weighted Average
// -----------------------------------------------------

export function weightedAverage(items = []) {

  if (!items.length) {
    return 0;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const item of items) {

    const score = safeNumber(item.score);

    const weight = safeNumber(item.weight);

    weightedSum += score * weight;

    totalWeight += weight;

  }

  if (totalWeight <= 0) {
    return 0;
  }

  return weightedSum / totalWeight;

}

// -----------------------------------------------------
// Percentage Change
// -----------------------------------------------------

export function percentChange(previous, current) {

  previous = safeNumber(previous);

  current = safeNumber(current);

  if (previous === 0) {

    return current === 0
      ? 0
      : 100;

  }

  return ((current - previous) / previous) * 100;

}

// -----------------------------------------------------
// Delta
// -----------------------------------------------------

export function delta(previous, current) {

  return safeNumber(current) - safeNumber(previous);

}

// -----------------------------------------------------
// Normalize Score
// -----------------------------------------------------

export function normalizeScore(score) {

  return clamp(score);

}

// -----------------------------------------------------
// Normalize Confidence
// -----------------------------------------------------

export function normalizeConfidence(confidence) {

  return clamp(confidence);

}

// -----------------------------------------------------
// Is Improvement
// -----------------------------------------------------

export function isImprovement(previous, current) {

  return safeNumber(current) >
         safeNumber(previous);

}

// -----------------------------------------------------
// Is Decline
// -----------------------------------------------------

export function isDecline(previous, current) {

  return safeNumber(current) <
         safeNumber(previous);

}

// -----------------------------------------------------
// Calculate Trend
// -----------------------------------------------------

export function calculateTrend(previous, current) {

  previous = safeNumber(previous);

  current = safeNumber(current);

  const difference = current - previous;

  if (difference >= 15) {
    return "STRONGLY_IMPROVING";
  }

  if (difference >= 5) {
    return "IMPROVING";
  }

  if (difference <= -15) {
    return "STRONGLY_WEAKENING";
  }

  if (difference <= -5) {
    return "WEAKENING";
  }

  return "STABLE";

}

// -----------------------------------------------------
// Health Category
// -----------------------------------------------------

export function healthCategory(score) {

  score = normalizeScore(score);

  if (score >= 90) {
    return "EXCELLENT";
  }

  if (score >= 75) {
    return "HEALTHY";
  }

  if (score >= 60) {
    return "WEAKENING";
  }

  if (score >= 40) {
    return "HIGH_RISK";
  }

  if (score >= 20) {
    return "CRITICAL";
  }

  return "EXIT";

}