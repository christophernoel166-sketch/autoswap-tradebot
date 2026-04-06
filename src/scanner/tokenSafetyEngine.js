// src/scanner/tokenSafetyEngine.js

export const SCAN_RESULT_TTL_MS = 30 * 1000;

export const VERDICTS = {
  SAFE: "SAFE",
  CAUTION: "CAUTION",
  UNSAFE: "UNSAFE",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
};

export const HARD_FAIL_RULES = {
  minAgeMinutes: 3,
  minLiquidityUsd: 15_000,
  minMarketCapUsd: 30_000,

  // holder count removed for now
  maxLargestHolderPercent: 15,
  maxTop10HoldingPercent: 30,

  maxBundleScore: 7,
  maxBundledWallets: 5,

  maxFundingClusterScore: 5,
  maxLargestFundingCluster: 4,

  maxSniperWallets: 15,

  // NEW: anti-fake-pump integrity hard fails
  minWalletParticipationScore: 30,
  minVelocitySanityScore: 35,
  maxWashTradingRiskScore: 75,
  maxBundleSuspicionScore: 80,
};

export const SCORE_THRESHOLDS = {
  safe: 80,
  caution: 65,
};

export const REQUIRED_FIELDS = [
  "ageMinutes",
  "liquidityUsd",
  "marketCapUsd",
  "volume5mUsd",
  "buys5m",
  "sells5m",
  "largestHolderPercent",
  "top10HoldingPercent",
  "bundleScore",
  "bundledWalletCount",
  "fundingClusterScore",
  "largestFundingCluster",
  "momentumScore",
  "velocityBreakoutScore",
  "sniperWalletCount",

  // NEW: integrity
  "walletParticipationScore",
  "velocitySanityScore",
  "washTradingRiskScore",
  "bundleSuspicionScore",
  "artificialVolumeFlag",
  "fakeMomentumFlag",
];

function isNil(value) {
  return value === null || value === undefined;
}

function toNumber(value, fallback = null) {
  if (isNil(value) || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function uniqueStrings(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function normalizeMetrics(raw = {}) {
  return {
    ageMinutes: toNumber(raw.ageMinutes),
    liquidityUsd: toNumber(raw.liquidityUsd),
    marketCapUsd: toNumber(raw.marketCapUsd),
    volume5mUsd: toNumber(raw.volume5mUsd),
    buys5m: toNumber(raw.buys5m),
    sells5m: toNumber(raw.sells5m),

    // holderCount intentionally kept optional / unused for scoring
    holderCount: toNumber(raw.holderCount),
    largestHolderPercent: toNumber(raw.largestHolderPercent),
    top10HoldingPercent: toNumber(raw.top10HoldingPercent),

    smartDegenCount: toNumber(raw.smartDegenCount, 0),
    botDegenCount: toNumber(raw.botDegenCount, 0),
    ratTraderCount: toNumber(raw.ratTraderCount, 0),
    alphaCallerCount: toNumber(raw.alphaCallerCount, 0),
    sniperWalletCount: toNumber(raw.sniperWalletCount),

    bundleScore: toNumber(raw.bundleScore),
    bundledWalletCount: toNumber(raw.bundledWalletCount),
    fundingClusterScore: toNumber(raw.fundingClusterScore),
    largestFundingCluster: toNumber(raw.largestFundingCluster),

    momentumScore: toNumber(raw.momentumScore),
    velocityBreakoutScore: toNumber(raw.velocityBreakoutScore),

    // NEW: market integrity
    walletParticipationScore: toNumber(raw.walletParticipationScore),
    velocitySanityScore: toNumber(raw.velocitySanityScore),
    washTradingRiskScore: toNumber(raw.washTradingRiskScore),
    bundleSuspicionScore: toNumber(raw.bundleSuspicionScore),
    artificialVolumeFlag: Boolean(raw.artificialVolumeFlag),
    fakeMomentumFlag: Boolean(raw.fakeMomentumFlag),

    boosted: Boolean(raw.boosted),
  };
}

function findMissingRequiredFields(metrics) {
  return REQUIRED_FIELDS.filter((field) => {
    const value = metrics[field];
    return isNil(value) || Number.isNaN(value);
  });
}

function scoreMarket(m) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  if (m.ageMinutes >= 5 && m.ageMinutes <= 180) {
    score += 5;
    reasons.push("Healthy token age");
  } else if (m.ageMinutes > 180 && m.ageMinutes <= 720) {
    score += 3;
    warnings.push("Token is no longer very fresh");
  } else if (m.ageMinutes >= 3 && m.ageMinutes < 5) {
    score += 2;
    warnings.push("Token is very new");
  }

  if (m.liquidityUsd >= 50_000) {
    score += 8;
    reasons.push("Strong liquidity");
  } else if (m.liquidityUsd >= 30_000) {
    score += 6;
  } else if (m.liquidityUsd >= 20_000) {
    score += 4;
  } else if (m.liquidityUsd >= 15_000) {
    score += 2;
    warnings.push("Liquidity is passable but not strong");
  }

  if (m.marketCapUsd >= 80_000 && m.marketCapUsd <= 500_000) {
    score += 4;
  } else if (m.marketCapUsd >= 50_000) {
    score += 3;
  } else if (m.marketCapUsd >= 30_000) {
    score += 1;
  }

  if (m.volume5mUsd >= 25_000) {
    score += 5;
    reasons.push("Strong recent trading volume");
  } else if (m.volume5mUsd >= 12_000) {
    score += 4;
  } else if (m.volume5mUsd >= 5_000) {
    score += 3;
  } else if (m.volume5mUsd >= 2_500) {
    score += 1;
  }

  const totalTx = (m.buys5m || 0) + (m.sells5m || 0);
  if (totalTx >= 50) {
    if (m.buys5m > m.sells5m) {
      score += 3;
    } else if (m.buys5m === m.sells5m) {
      score += 2;
    } else {
      score += 1;
      warnings.push("Sell pressure slightly exceeds buy pressure");
    }
  } else {
    warnings.push("Very light recent transaction activity");
  }

  return { score, reasons, warnings };
}

function scoreHolderSafety(m) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  // Largest holder (15)
  if (m.largestHolderPercent <= 8) {
    score += 15;
    reasons.push("Largest holder concentration is low");
  } else if (m.largestHolderPercent <= 10) {
    score += 12;
  } else if (m.largestHolderPercent <= 12) {
    score += 9;
  } else if (m.largestHolderPercent <= 15) {
    score += 6;
  } else if (m.largestHolderPercent <= 18) {
    score += 3;
    warnings.push("Largest holder concentration is elevated");
  }

  // Top 10 holding (15)
  if (m.top10HoldingPercent <= 20) {
    score += 15;
    reasons.push("Top 10 concentration is healthy");
  } else if (m.top10HoldingPercent <= 25) {
    score += 11;
  } else if (m.top10HoldingPercent <= 30) {
    score += 7;
  } else if (m.top10HoldingPercent <= 35) {
    score += 3;
    warnings.push("Top 10 concentration is elevated");
  }

  return { score, reasons, warnings };
}

function scoreWalletIntelligence(m) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  if (m.smartDegenCount >= 5) {
    score += 4;
    reasons.push("Strong smart money participation");
  } else if (m.smartDegenCount >= 2) {
    score += 3;
  } else if (m.smartDegenCount >= 1) {
    score += 2;
  }

  if (m.botDegenCount === 0) {
    score += 3;
  } else if (m.botDegenCount <= 2) {
    score += 2;
  } else if (m.botDegenCount <= 4) {
    score += 1;
    warnings.push("Some bot activity detected");
  }

  if (m.ratTraderCount === 0) {
    score += 3;
  } else if (m.ratTraderCount <= 2) {
    score += 2;
  } else if (m.ratTraderCount <= 4) {
    score += 1;
    warnings.push("Some rat trader activity detected");
  }

  if (m.alphaCallerCount >= 3) {
    score += 2;
  } else if (m.alphaCallerCount >= 1) {
    score += 1;
  }

  if (m.sniperWalletCount <= 5) {
    score += 3;
  } else if (m.sniperWalletCount <= 10) {
    score += 2;
  } else if (m.sniperWalletCount <= 15) {
    score += 1;
    warnings.push("Sniper wallet count is elevated");
  }

  return { score, reasons, warnings };
}

function scoreRiskStructure(m) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  if (m.bundleScore <= 2) {
    score += 8;
    reasons.push("Very low bundle risk");
  } else if (m.bundleScore <= 4) {
    score += 6;
  } else if (m.bundleScore <= 6) {
    score += 3;
  } else if (m.bundleScore <= 7) {
    score += 1;
    warnings.push("Bundle score is elevated");
  }

  if (m.bundledWalletCount <= 1) {
    score += 4;
  } else if (m.bundledWalletCount <= 2) {
    score += 3;
  } else if (m.bundledWalletCount <= 3) {
    score += 2;
  } else if (m.bundledWalletCount <= 5) {
    score += 1;
    warnings.push("Bundled wallet count is elevated");
  }

  if (m.fundingClusterScore === 0) {
    score += 4;
  } else if (m.fundingClusterScore <= 2) {
    score += 3;
  } else if (m.fundingClusterScore <= 4) {
    score += 1;
    warnings.push("Funding cluster score is elevated");
  }

  if (m.largestFundingCluster === 0) {
    score += 4;
  } else if (m.largestFundingCluster <= 2) {
    score += 3;
  } else if (m.largestFundingCluster <= 4) {
    score += 1;
    warnings.push("Largest funding cluster is elevated");
  }

  return { score, reasons, warnings };
}

function scoreMomentum(m) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  if (m.momentumScore >= 85) {
    score += 5;
    reasons.push("Strong momentum");
  } else if (m.momentumScore >= 70) {
    score += 4;
  } else if (m.momentumScore >= 55) {
    score += 3;
  } else if (m.momentumScore >= 40) {
    score += 1;
  } else {
    warnings.push("Momentum is weak");
  }

  if (m.velocityBreakoutScore >= 85) {
    score += 5;
    reasons.push("Strong breakout velocity");
  } else if (m.velocityBreakoutScore >= 70) {
    score += 4;
  } else if (m.velocityBreakoutScore >= 55) {
    score += 3;
  } else if (m.velocityBreakoutScore >= 40) {
    score += 1;
  } else {
    warnings.push("Velocity breakout is weak");
  }

  return { score, reasons, warnings };
}

function scoreMarketIntegrity(m) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  if (m.walletParticipationScore >= 85) {
    score += 10;
    reasons.push("Strong wallet participation quality");
  } else if (m.walletParticipationScore >= 70) {
    score += 8;
  } else if (m.walletParticipationScore >= 55) {
    score += 5;
  } else if (m.walletParticipationScore >= 40) {
    score += 2;
    warnings.push("Wallet participation is only moderate");
  } else {
    warnings.push("Wallet participation is weak");
  }

  if (m.velocitySanityScore >= 85) {
    score += 8;
    reasons.push("Velocity profile looks organic");
  } else if (m.velocitySanityScore >= 70) {
    score += 6;
  } else if (m.velocitySanityScore >= 55) {
    score += 4;
  } else if (m.velocitySanityScore >= 40) {
    score += 1;
    warnings.push("Velocity profile is somewhat suspicious");
  } else {
    warnings.push("Velocity profile looks abnormal");
  }

  if (m.washTradingRiskScore <= 15) {
    score += 8;
    reasons.push("Low wash-trading risk");
  } else if (m.washTradingRiskScore <= 30) {
    score += 6;
  } else if (m.washTradingRiskScore <= 45) {
    score += 3;
  } else if (m.washTradingRiskScore <= 60) {
    score += 1;
    warnings.push("Wash-trading risk is elevated");
  } else {
    warnings.push("Wash-trading risk is high");
  }

  if (m.bundleSuspicionScore <= 15) {
    score += 4;
  } else if (m.bundleSuspicionScore <= 30) {
    score += 3;
  } else if (m.bundleSuspicionScore <= 50) {
    score += 1;
    warnings.push("Bundle-like activity is elevated");
  } else {
    warnings.push("Bundle-like activity looks suspicious");
  }

  if (m.artificialVolumeFlag) {
    warnings.push("Artificial volume risk detected");
  } else {
    score += 2;
  }

  if (m.fakeMomentumFlag) {
    warnings.push("Fake momentum pattern detected");
  } else {
    score += 2;
  }

  return { score, reasons, warnings };
}

function runHardFailChecks(m) {
  const failedRules = [];

  if (m.ageMinutes < HARD_FAIL_RULES.minAgeMinutes) {
    failedRules.push("Token is too new");
  }
  if (m.liquidityUsd < HARD_FAIL_RULES.minLiquidityUsd) {
    failedRules.push("Liquidity is below minimum");
  }
  if (m.marketCapUsd < HARD_FAIL_RULES.minMarketCapUsd) {
    failedRules.push("Market cap is below minimum");
  }
  if (m.largestHolderPercent > HARD_FAIL_RULES.maxLargestHolderPercent) {
    failedRules.push("Largest holder concentration too high");
  }
  if (m.top10HoldingPercent > HARD_FAIL_RULES.maxTop10HoldingPercent) {
    failedRules.push("Top 10 concentration too high");
  }
  if (m.bundleScore > HARD_FAIL_RULES.maxBundleScore) {
    failedRules.push("Bundle score too high");
  }
  if (m.bundledWalletCount > HARD_FAIL_RULES.maxBundledWallets) {
    failedRules.push("Bundled wallet count too high");
  }
  if (m.fundingClusterScore > HARD_FAIL_RULES.maxFundingClusterScore) {
    failedRules.push("Funding cluster score too high");
  }
  if (m.largestFundingCluster > HARD_FAIL_RULES.maxLargestFundingCluster) {
    failedRules.push("Largest funding cluster too high");
  }
  if (m.sniperWalletCount > HARD_FAIL_RULES.maxSniperWallets) {
    failedRules.push("Sniper wallet count too high");
  }

  // NEW: anti-fake-pump / integrity hard fails
  if (m.walletParticipationScore < HARD_FAIL_RULES.minWalletParticipationScore) {
    failedRules.push("Wallet participation quality too weak");
  }
  if (m.velocitySanityScore < HARD_FAIL_RULES.minVelocitySanityScore) {
    failedRules.push("Velocity profile looks artificial");
  }
  if (m.washTradingRiskScore > HARD_FAIL_RULES.maxWashTradingRiskScore) {
    failedRules.push("Wash-trading risk too high");
  }
  if (m.bundleSuspicionScore > HARD_FAIL_RULES.maxBundleSuspicionScore) {
    failedRules.push("Bundle suspicion too high");
  }
  if (m.artificialVolumeFlag) {
    failedRules.push("Artificial volume detected");
  }
  if (m.fakeMomentumFlag) {
    failedRules.push("Fake momentum detected");
  }

  return failedRules;
}

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
        riskStructure: 0,
        momentum: 0,
        marketIntegrity: 0,
      },
      scannedAt,
      expiresAt,
    };
  }

  const failedRules = runHardFailChecks(metrics);

  if (failedRules.length > 0) {
    return {
      verdict: VERDICTS.UNSAFE,
      score: 0,
      showBuy: false,
      buyConfidence: "NONE",
      failedRules,
      reasons: [],
      warnings: [],
      missingFields: [],
      metrics,
      categoryScores: {
        market: 0,
        holderSafety: 0,
        walletIntelligence: 0,
        riskStructure: 0,
        momentum: 0,
        marketIntegrity: 0,
      },
      scannedAt,
      expiresAt,
    };
  }

  const market = scoreMarket(metrics);
  const holderSafety = scoreHolderSafety(metrics);
  const walletIntelligence = scoreWalletIntelligence(metrics);
  const riskStructure = scoreRiskStructure(metrics);
  const momentum = scoreMomentum(metrics);
  const marketIntegrity = scoreMarketIntegrity(metrics);

  const totalScore =
    market.score +
    holderSafety.score +
    walletIntelligence.score +
    riskStructure.score +
    momentum.score +
    marketIntegrity.score;

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
    ...riskStructure.reasons,
    ...momentum.reasons,
    ...marketIntegrity.reasons,
    ...(metrics.boosted ? ["Token is boosted"] : []),
  ]);

  const warnings = uniqueStrings([
    ...market.warnings,
    ...holderSafety.warnings,
    ...walletIntelligence.warnings,
    ...riskStructure.warnings,
    ...momentum.warnings,
    ...marketIntegrity.warnings,
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
    failedRules: [],
    reasons,
    warnings,
    missingFields: [],
    metrics,
    categoryScores: {
      market: market.score,
      holderSafety: holderSafety.score,
      walletIntelligence: walletIntelligence.score,
      riskStructure: riskStructure.score,
      momentum: momentum.score,
      marketIntegrity: marketIntegrity.score,
    },
    scannedAt,
    expiresAt,
  };
}

export function canExecuteManualBuy(scanResult, now = new Date()) {
  if (!scanResult) {
    return { ok: false, reason: "No scan result found" };
  }

  const evaluation = scanResult?.evaluation || {};
  const verdict = evaluation.verdict;
  const showBuy = evaluation.showBuy;

  const expiresAtMs = new Date(scanResult.expiresAt).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs)) {
    return { ok: false, reason: "Invalid scan expiry data" };
  }

  if (nowMs > expiresAtMs) {
    return { ok: false, reason: "Scan result expired, please rescan token" };
  }

  if (!showBuy) {
    return { ok: false, reason: "Token is not approved for trading" };
  }

  if (verdict === "SAFE") {
    return { ok: true };
  }

  if (verdict === "CAUTION") {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "Token is unsafe",
  };
}

export function formatScanResponse({
  token = {},
  rawMetrics = {},
  options = {},
} = {}) {
  const evaluation = evaluateTokenSafety(rawMetrics, options);

  return {
    token: {
      mintAddress: token.mintAddress || null,
      symbol: token.symbol || null,
      name: token.name || null,
      boosted: Boolean(rawMetrics?.boosted ?? token?.boosted),
    },
    metrics: evaluation.metrics,
    evaluation: {
      verdict: evaluation.verdict,
      score: evaluation.score,
      showBuy: evaluation.showBuy,
      buyConfidence: evaluation.buyConfidence,
      failedRules: evaluation.failedRules,
      reasons: evaluation.reasons,
      warnings: evaluation.warnings,
      missingFields: evaluation.missingFields,
      categoryScores: evaluation.categoryScores,
    },
    scannedAt: evaluation.scannedAt,
    expiresAt: evaluation.expiresAt,
  };
}