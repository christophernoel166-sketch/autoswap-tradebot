function calculateGrowth(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  if (previousValue <= 0) {
    return 0;
  }

  return (
    ((currentValue - previousValue) /
      previousValue) *
    100
  );
}

// =========================================================
// AI Volume Intelligence Helpers
// =========================================================

function getVolumeStrength(score) {

  if (score >= 90) return "VERY_STRONG";

  if (score >= 75) return "STRONG";

  if (score >= 60) return "MODERATE";

  if (score >= 40) return "WEAK";

  return "VERY_WEAK";

}

function getVolumeTrend(acceleration) {

  if (acceleration >= 100) return "EXPLODING";

  if (acceleration >= 50) return "ACCELERATING";

  if (acceleration >= 10) return "GROWING";

  if (acceleration >= -10) return "STABLE";

  if (acceleration >= -30) return "DECLINING";

  return "COLLAPSING";

}

function getBuyPressureLevel(ratio) {

  if (ratio >= 3) return "EXTREME";

  if (ratio >= 2) return "HIGH";

  if (ratio >= 1.5) return "MODERATE";

  if (ratio >= 1) return "BALANCED";

  return "LOW";

}

function getOrganicVolume(ratioScore, accelerationScore) {

  return ratioScore >= 70 &&
         accelerationScore >= 70;

}

export async function fetchVolumeAnalysisData({
  volume5mUsd,
  buys5m,
  sells5m,
  previousVolume5mUsd = 0,
  previousBuys5m = 0,
  previousSells5m = 0,
  context = {},
}) {
  const volume = Number(volume5mUsd || 0);
  const buys = Number(buys5m || 0);
  const sells = Number(sells5m || 0);

  const previousVolume =
    Number(previousVolume5mUsd || 0);

  const previousBuys =
    Number(previousBuys5m || 0);

  const previousSells =
    Number(previousSells5m || 0);

  const buySellRatio =
    sells > 0 ? buys / sells : buys;

  // =========================
  // BUY/SELL RATIO SCORE
  // =========================

  let ratioScore = 20;

  if (buySellRatio >= 3) {
    ratioScore = 100;
  } else if (buySellRatio >= 2) {
    ratioScore = 85;
  } else if (buySellRatio >= 1.5) {
    ratioScore = 70;
  } else if (buySellRatio >= 1) {
    ratioScore = 50;
  }

  // =========================
  // VOLUME ACCELERATION
  // =========================

  const volumeAcceleration =
    calculateGrowth(
      volume,
      previousVolume
    );

  let accelerationScore = 50;

  if (volumeAcceleration >= 200) {
    accelerationScore = 100;
  } else if (volumeAcceleration >= 100) {
    accelerationScore = 90;
  } else if (volumeAcceleration >= 50) {
    accelerationScore = 80;
  } else if (volumeAcceleration >= 25) {
    accelerationScore = 70;
  } else if (volumeAcceleration >= 0) {
    accelerationScore = 50;
  } else if (volumeAcceleration >= -25) {
    accelerationScore = 40;
  } else {
    accelerationScore = 20;
  }

  // =========================
  // BUY GROWTH
  // =========================

  const buyGrowth =
    calculateGrowth(
      buys,
      previousBuys
    );

  let buyGrowthScore = 50;

  if (buyGrowth >= 200) {
    buyGrowthScore = 100;
  } else if (buyGrowth >= 100) {
    buyGrowthScore = 90;
  } else if (buyGrowth >= 50) {
    buyGrowthScore = 80;
  } else if (buyGrowth >= 25) {
    buyGrowthScore = 70;
  } else if (buyGrowth >= 0) {
    buyGrowthScore = 50;
  } else if (buyGrowth >= -25) {
    buyGrowthScore = 40;
  } else {
    buyGrowthScore = 20;
  }

  // =========================
  // FINAL SCORE
  // =========================

  const volumeScore = Math.round(
    ratioScore * 0.5 +
      accelerationScore * 0.3 +
      buyGrowthScore * 0.2
  );

  let volumeVerdict = "Bearish";

  if (volumeScore >= 90) {
    volumeVerdict = "Explosive";
  } else if (volumeScore >= 75) {
    volumeVerdict = "Strong";
  } else if (volumeScore >= 60) {
    volumeVerdict = "Bullish";
  } else if (volumeScore >= 40) {
    volumeVerdict = "Neutral";
  }

// =========================================================
// AI Volume Intelligence
// =========================================================

const volumeStrength =
  getVolumeStrength(volumeScore);

const volumeTrend =
  getVolumeTrend(volumeAcceleration);

const buyPressureLevel =
  getBuyPressureLevel(buySellRatio);

const organicVolume =
  getOrganicVolume(
    ratioScore,
    accelerationScore
  );

// =========================================================
// AI Evidence
// =========================================================

const evidence = {

  confidenceContribution:

    volumeScore,

  confidenceWeight:

    4,

  strengths: [],

  weaknesses: [],

  risks: [],

  assumptions: [],

  convictionDrivers: [],

  monitoringPriorities: [],

};

// ---------------------------------------------------------
// Strengths
// ---------------------------------------------------------

if (
  volumeStrength === "VERY_STRONG" ||
  volumeStrength === "STRONG"
) {

  evidence.strengths.push(
    "Trading volume is strong"
  );

}

if (organicVolume) {

  evidence.strengths.push(
    "Volume appears organic"
  );

}

if (
  buyPressureLevel === "HIGH" ||
  buyPressureLevel === "EXTREME"
) {

  evidence.strengths.push(
    "Buying activity dominates selling"
  );

}

if (
  volumeTrend === "ACCELERATING" ||
  volumeTrend === "EXPLODING"
) {

  evidence.strengths.push(
    "Volume is accelerating"
  );

}

// ---------------------------------------------------------
// Weaknesses
// ---------------------------------------------------------

if (
  volumeStrength === "WEAK" ||
  volumeStrength === "VERY_WEAK"
) {

  evidence.weaknesses.push(
    "Trading volume is weak"
  );

}

if (
  buyPressureLevel === "LOW"
) {

  evidence.weaknesses.push(
    "Selling pressure is elevated"
  );

}

// ---------------------------------------------------------
// Risks
// ---------------------------------------------------------

if (
  volumeTrend === "DECLINING"
) {

  evidence.risks.push(
    "Volume is declining"
  );

}

if (
  volumeTrend === "COLLAPSING"
) {

  evidence.risks.push(
    "Rapid volume decline may signal fading interest"
  );

}

// ---------------------------------------------------------
// Assumptions
// ---------------------------------------------------------

evidence.assumptions.push(
  "Current trading activity continues"
);

// ---------------------------------------------------------
// Conviction Drivers
// ---------------------------------------------------------

if (organicVolume) {

  evidence.convictionDrivers.push(
    "Organic participation"
  );

}

if (
  volumeTrend === "EXPLODING"
) {

  evidence.convictionDrivers.push(
    "Explosive volume growth"
  );

}

// ---------------------------------------------------------
// Monitoring Priorities
// ---------------------------------------------------------

evidence.monitoringPriorities.push(
  "Monitor volume acceleration"
);

evidence.monitoringPriorities.push(
  "Monitor buy/sell ratio"
);

evidence.monitoringPriorities.push(
  "Monitor volume trend"
);

// =========================================================
// Attach Evidence To AI Context
// =========================================================

if (
  context &&
  typeof context === "object"
) {

  context.evidence ??= {};

  context.evidence.volume =
    evidence;

}

return {

  // =======================================================
  // Existing Outputs (Backward Compatible)
  // =======================================================

  volumeUsd: volume,

  previousVolumeUsd:
    previousVolume,

  buys5m: buys,

  sells5m: sells,

  previousBuys5m:
    previousBuys,

  previousSells5m:
    previousSells,

  buySellRatio:
    Number(
      buySellRatio.toFixed(2)
    ),

  volumeAcceleration:
    Number(
      volumeAcceleration.toFixed(2)
    ),

  buyGrowth:
    Number(
      buyGrowth.toFixed(2)
    ),

  ratioScore,

  accelerationScore,

  buyGrowthScore,

  volumeScore,

  volumeVerdict,

  // =======================================================
  // AI Intelligence
  // =======================================================

 volumeStrength,

volumeTrend,

volumeTrendConfidence:

  volumeStrength === "VERY_STRONG"
    ? "HIGH"

    : volumeStrength === "STRONG"
      ? "MEDIUM"

      : "LOW",

  buyPressure: {

    ratio: Number(
      buySellRatio.toFixed(3)
    ),

    level: buyPressureLevel,

  },

 organicVolume: {

  detected: organicVolume,

  confidence:

    organicVolume
      ? "HIGH"
      : "LOW",

},

  // =======================================================
  // AI Evidence
  // =======================================================

  evidence,

};
}