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

export async function fetchVolumeAnalysisData({
  volume5mUsd,
  buys5m,
  sells5m,
  previousVolume5mUsd = 0,
  previousBuys5m = 0,
  previousSells5m = 0,
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

  return {
    volumeUsd: volume,

    previousVolumeUsd:
      previousVolume,

    buys5m: buys,
    sells5m: sells,

    previousBuys5m:
      previousBuys,

    previousSells5m:
      previousSells,

    buySellRatio: Number(
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
  };
}