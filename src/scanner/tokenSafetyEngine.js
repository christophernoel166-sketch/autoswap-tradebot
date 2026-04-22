export function evaluateTokenSafety(rawMetrics = {}, options = {}) {
  const ttlMs = Number.isFinite(options.ttlMs)
    ? options.ttlMs
    : SCAN_RESULT_TTL_MS;

  const scannedAtDate = options.scannedAt
    ? new Date(options.scannedAt)
    : new Date();

  const scannedAt = scannedAtDate.toISOString();
  const expiresAt = new Date(scannedAtDate.getTime() + ttlMs).toISOString();

  const metrics = normalizeMetrics(rawMetrics);
  const missingFields = findMissingRequiredFields(metrics);

  if (missingFields.length > 0) {
    return {
      verdict: VERDICTS.INSUFFICIENT_DATA,
      score: 0,
      showBuy: false,
      buyConfidence: "NONE",
      failedRules: [],
      reasons: [],
      warnings: [`Missing required scan fields: ${missingFields.join(", ")}`],
      missingFields,
      metrics,
      categoryScores: {
        market: 0,
        holderSafety: 0,
        walletIntelligence: 0,
        profitWallets: 0,
        riskStructure: 0,
        momentum: 0,
        marketIntegrity: 0,
        rugRisk: 0,
      },
      scannedAt,
      expiresAt,
    };
  }

  const failedRules = runHardFailChecks(metrics);

  const market = scoreMarket(metrics);
  const holderSafety = scoreHolderSafety(metrics);
  const walletIntelligence = scoreWalletIntelligence(metrics);
  const profitWallets = scoreProfitWallets(metrics);
  const riskStructure = scoreRiskStructure(metrics);
  const momentum = scoreMomentum(metrics);
  const marketIntegrity = scoreMarketIntegrity(metrics);
  const rugRisk = scoreRugRisk(metrics);

  let totalScore =
    market.score +
    holderSafety.score +
    walletIntelligence.score +
    profitWallets.score +
    riskStructure.score +
    momentum.score +
    marketIntegrity.score +
    rugRisk.score;

  // soften hard fails instead of auto-killing the token
  const hardFailPenalty = Math.min(failedRules.length * 8, 32);
  totalScore = Math.max(0, totalScore - hardFailPenalty);

  let verdict = VERDICTS.UNSAFE;
  if (totalScore >= SCORE_THRESHOLDS.safe) {
    verdict = VERDICTS.SAFE;
  } else if (totalScore >= SCORE_THRESHOLDS.caution) {
    verdict = VERDICTS.CAUTION;
  }

  const reasons = uniqueStrings([
    ...market.reasons,
    ...holderSafety.reasons,
    ...walletIntelligence.reasons,
    ...profitWallets.reasons,
    ...riskStructure.reasons,
    ...momentum.reasons,
    ...marketIntegrity.reasons,
    ...rugRisk.reasons,
    ...(metrics.boosted ? ["Token is boosted"] : []),
  ]);

  const warnings = uniqueStrings([
    ...market.warnings,
    ...holderSafety.warnings,
    ...walletIntelligence.warnings,
    ...profitWallets.warnings,
    ...riskStructure.warnings,
    ...momentum.warnings,
    ...marketIntegrity.warnings,
    ...rugRisk.warnings,
  ]);

  const allWarnings = uniqueStrings([
    ...warnings,
    ...failedRules,
  ]);

  const roundedScore = round2(totalScore);

  return {
    verdict,
    score: roundedScore,
    showBuy:
      verdict === VERDICTS.SAFE ||
      (verdict === VERDICTS.CAUTION &&
        roundedScore >= SCORE_THRESHOLDS.caution),
    buyConfidence:
      verdict === VERDICTS.SAFE
        ? "HIGH"
        : verdict === VERDICTS.CAUTION
        ? "MEDIUM"
        : "NONE",
    failedRules,
    reasons,
    warnings: allWarnings,
    missingFields: [],
    metrics,
    categoryScores: {
      market: market.score,
      holderSafety: holderSafety.score,
      walletIntelligence: walletIntelligence.score,
      profitWallets: profitWallets.score,
      riskStructure: riskStructure.score,
      momentum: momentum.score,
      marketIntegrity: marketIntegrity.score,
      rugRisk: rugRisk.score,
    },
    scannedAt,
    expiresAt,
  };
}