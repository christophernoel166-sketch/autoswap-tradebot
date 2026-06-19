import TokenOutcome from "../../models/TokenOutcome.js";
import PatternStats from "../../models/PatternStats.js";
import {
  scoreBucket,
  rugRiskBucket,
} from "../utils/patternBuckets.js";

const MIN_PATTERN_SAMPLES = 20;

function pct(a, b) {
  if (!b) return 0;
  return Number(((a / b) * 100).toFixed(2));
}

function avg(values) {
  if (!values.length) return 0;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function median(values) {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (
      (sorted[middle - 1] + sorted[middle]) / 2
    );
  }

  return sorted[middle];
}

function buildConfidence({
  winRate,
  samples,
  averageReturn24h,
}) {
  const sampleWeight = Math.min(samples, 100) / 100;

  const confidence =
    winRate * 0.6 +
    sampleWeight * 100 * 0.3 +
    Math.min(
      Math.max(averageReturn24h, 0),
      100
    ) *
      0.1;

  return Number(confidence.toFixed(2));
}

async function updatePattern(
  key,
  docs,
  metadata = {}
) {
  if (docs.length < MIN_PATTERN_SAMPLES) {
    return;
  }

  const winners = docs.filter(
    (d) =>
      d.label === "WINNER" ||
      d.label === "MOONSHOT"
  );

  const moonshots = docs.filter(
    (d) => d.label === "MOONSHOT"
  );

  const losers = docs.filter(
    (d) =>
      d.label === "LOSER" ||
      d.label === "RUG_OR_FAILURE"
  );

  const neutrals = docs.filter(
    (d) => d.label === "NEUTRAL"
  );

  const returns = docs
    .map((d) => Number(d.return24h))
    .filter(Number.isFinite);

  const averageReturn24h = Number(
    avg(returns).toFixed(2)
  );

  const medianReturn24h = Number(
    median(returns).toFixed(2)
  );

  const bestReturn24h = returns.length
    ? Math.max(...returns)
    : 0;

  const worstReturn24h = returns.length
    ? Math.min(...returns)
    : 0;

  const winRate = pct(
    winners.length,
    docs.length
  );

  const moonshotRate = pct(
    moonshots.length,
    docs.length
  );

  const confidenceScore =
    buildConfidence({
      winRate,
      samples: docs.length,
      averageReturn24h,
    });

  await PatternStats.findOneAndUpdate(
    { key },
    {
      key,

      samples: docs.length,

      winners: winners.length,

      moonshots: moonshots.length,

      losers: losers.length,

      neutrals: neutrals.length,

      winRate,

      moonshotRate,

      averageReturn24h,

      medianReturn24h,

      bestReturn24h,

      worstReturn24h,

      confidenceScore,

      metadata,

      lastComputedAt: new Date(),
    },
    {
      upsert: true,
      new: true,
    }
  );
}

export async function rebuildPatternStats() {
  const completed =
    await TokenOutcome.find({
      trackingComplete: true,
    }).lean();

  // ----------------------------------
  // GLOBAL
  // ----------------------------------

  await updatePattern(
    "GLOBAL",
    completed
  );

  // ----------------------------------
  // AUTO-GENERATED BUCKET PATTERNS
  // ----------------------------------

  const grouped = new Map();

  for (const doc of completed) {
    const momentum =
      scoreBucket(doc.momentumScore);

    const wallet =
      scoreBucket(doc.walletQualityScore);

    const rug =
      rugRiskBucket(doc.rugRiskScore);

    const key = [
      momentum,
      rug,
      wallet,
    ].join("__");

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(doc);
  }

  for (const [key, docs] of grouped) {
    const parts = key.split("__");

    await updatePattern(
      key,
      docs,
      {
        momentumBucket: parts[0],
        rugRiskBucket: parts[1],
        walletBucket: parts[2],
      }
    );
  }

  console.log(
    `✅ Rebuilt ${grouped.size + 1} pattern statistics`
  );
}