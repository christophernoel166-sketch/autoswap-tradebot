import PatternStats from "../../models/PatternStats.js";
import {
  scoreBucket,
  rugRiskBucket,
} from "../utils/patternBuckets.js";

export async function scoreSignal({
  momentumScore,
  walletQualityScore,
  rugRiskScore,
  forecastScore = 0,
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

  // No historical data yet.
  if (!stats) {
    return {
      patternKey,

      matched: false,

      adjustedForecastScore:
        baseForecast,

      confidenceScore: 0,

      historicalWinRate: 0,

      historicalSamples: 0,

      recommendation:
        baseForecast >= 80
          ? "BUY"
          : baseForecast >= 60
          ? "WATCH"
          : "AVOID",
    };
  }

  let adjusted =
    baseForecast;

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

  adjusted = Math.max(
    0,
    Math.min(100, adjusted)
  );

  let recommendation =
    "AVOID";

  if (adjusted >= 85) {
    recommendation =
      "STRONG_BUY";
  } else if (adjusted >= 70) {
    recommendation =
      "BUY";
  } else if (adjusted >= 55) {
    recommendation =
      "WATCH";
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
  };
}