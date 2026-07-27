import TokenOutcome from "../../models/TokenOutcome.js";
import PatternStats from "../../models/PatternStats.js";
import {
  scoreBucket,
  rugRiskBucket,
} from "../utils/patternBuckets.js";

// During development we keep this low so the AI
// starts learning quickly.
const MIN_PATTERN_SAMPLES = 5;

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
  averagePeakReturn,
}) {
  const sampleWeight = Math.min(samples, 100) / 100;

  const confidence =
    winRate * 0.6 +
    sampleWeight * 100 * 0.3 +
    Math.min(
      Math.max(averagePeakReturn, 0),
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

  // ==================================================
  // LEARN FROM PEAK RETURN FIRST
  // Fallback to return24h for legacy documents.
  // ==================================================

  const peakReturns = docs
    .map((d) =>
      Number.isFinite(d.peakReturn)
        ? Number(d.peakReturn)
        : Number(d.return24h)
    )
    .filter(Number.isFinite);

  const averagePeakReturn = Number(
    avg(peakReturns).toFixed(2)
  );

  const medianPeakReturn = Number(
    median(peakReturns).toFixed(2)
  );

  const bestPeakReturn = peakReturns.length
    ? Math.max(...peakReturns)
    : 0;

  const worstPeakReturn = peakReturns.length
    ? Math.min(...peakReturns)
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
      averagePeakReturn,
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

      // Stored using existing field names so the
      // rest of the system remains compatible.
      averageReturn24h: averagePeakReturn,
      medianReturn24h: medianPeakReturn,
      bestReturn24h: bestPeakReturn,
      worstReturn24h: worstPeakReturn,

      confidenceScore,

      metadata: {
        ...metadata,
        learningMode: "peak_return",
      },

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
    `🧠 AI rebuilt ${
      grouped.size + 1
    } historical pattern groups from ${
      completed.length
    } completed outcomes`
  );
}