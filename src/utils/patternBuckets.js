export function scoreBucket(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return "UNKNOWN";
  }

  if (score < 20) return "VERY_LOW";
  if (score < 40) return "LOW";
  if (score < 60) return "MEDIUM";
  if (score < 80) return "HIGH";

  return "VERY_HIGH";
}

export function rugRiskBucket(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return "UNKNOWN";
  }

  if (score <= 20) return "VERY_SAFE";
  if (score <= 40) return "SAFE";
  if (score <= 60) return "MODERATE";
  if (score <= 80) return "RISKY";

  return "VERY_RISKY";
}