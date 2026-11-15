
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  analyzeChartEntry as analyzeA
} from "./chartEntryService.baseline-replay.js";

import {
  analyzeChartEntry as analyzeB
} from "./chartEntryService.js";

import {
  analyzeChartEntry as analyzeC
} from "./chartEntryService.variantC-replay.js";

const DATA_DIR = path.resolve("data/chart-replay");
const FORWARD_CANDLES = 15;
const MIN_HISTORY = 100;

async function loadDataset() {
  const files = (await readdir(DATA_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (!files.length) {
    throw new Error(`No datasets found in ${DATA_DIR}`);
  }

  const filePath = path.join(DATA_DIR, files[files.length - 1]);
  const dataset = JSON.parse(await readFile(filePath, "utf8"));

  if (
    !Array.isArray(dataset.candles) ||
    dataset.candles.length <= MIN_HISTORY + FORWARD_CANDLES
  ) {
    throw new Error("Selected dataset has insufficient candles.");
  }

  return { dataset, filePath };
}

function keyOf(entry) {
  return `${entry.candleIndex}:${entry.setupType}`;
}

async function replay(analyzer, dataset, lastTestIndex) {
  const entries = [];
  const errors = [];

  for (
    let candleIndex = MIN_HISTORY;
    candleIndex < lastTestIndex;
    candleIndex++
  ) {
    const history = dataset.candles.slice(0, candleIndex + 1);

    let result;

    try {
      result = await analyzer(dataset.tokenMint, {
        timeframe: dataset.timeframe,
        limit: history.length,
        candles: history
      });
    } catch (error) {
      errors.push({
        candleIndex,
        error: error?.message ?? String(error)
      });
      continue;
    }

    if (!result?.ok) {
      errors.push({
        candleIndex,
        error: result?.error ?? result?.message ?? "Analysis unsuccessful"
      });
      continue;
    }

    if (result.action !== "enter_now") continue;

    const entryPrice = Number(
      result.metrics?.currentPrice ?? history.at(-1)?.close
    );

    const future = dataset.candles.slice(
      candleIndex + 1,
      candleIndex + 1 + FORWARD_CANDLES
    );

    if (
      !Number.isFinite(entryPrice) ||
      entryPrice <= 0 ||
      future.length !== FORWARD_CANDLES
    ) {
      continue;
    }

    const futureHigh = Math.max(...future.map((c) => Number(c.high)));
    const futureLow = Math.min(...future.map((c) => Number(c.low)));

    entries.push({
      candleIndex,
      time: history.at(-1)?.time,
      setupType: result.setupType ?? "unknown",
      score: result.score ?? null,
      entryPrice,
      maxUpsidePct: ((futureHigh - entryPrice) / entryPrice) * 100,
      maxDrawdownPct: ((futureLow - entryPrice) / entryPrice) * 100
    });
  }

  return { entries, errors };
}

function summarize(entries) {
  if (!entries.length) {
    return {
      signals: 0,
      avgUpsidePct: null,
      avgDrawdownPct: null,
      upsideAtLeast5Pct: 0,
      drawdownAtLeast5Pct: 0,
      upsideAtLeast10Pct: 0
    };
  }

  const avg = (field) =>
    entries.reduce((sum, entry) => sum + entry[field], 0) / entries.length;

  return {
    signals: entries.length,
    avgUpsidePct: Number(avg("maxUpsidePct").toFixed(2)),
    avgDrawdownPct: Number(avg("maxDrawdownPct").toFixed(2)),
    upsideAtLeast5Pct: entries.filter((e) => e.maxUpsidePct >= 5).length,
    drawdownAtLeast5Pct: entries.filter((e) => e.maxDrawdownPct <= -5).length,
    upsideAtLeast10Pct: entries.filter((e) => e.maxUpsidePct >= 10).length
  };
}

function compare(reference, candidate) {
  const referenceMap = new Map(
    reference.entries.map((entry) => [keyOf(entry), entry])
  );
  const candidateMap = new Map(
    candidate.entries.map((entry) => [keyOf(entry), entry])
  );

  const retained = [];
  const removed = [];
  const added = [];

  for (const [key, entry] of referenceMap) {
    if (candidateMap.has(key)) retained.push(entry);
    else removed.push(entry);
  }

  for (const [key, entry] of candidateMap) {
    if (!referenceMap.has(key)) added.push(entry);
  }

  return { retained, removed, added };
}

function detailRows(entries) {
  return entries.map((entry) => ({
    candleIndex: entry.candleIndex,
    time: entry.time,
    setupType: entry.setupType,
    score: entry.score,
    upsidePct: Number(entry.maxUpsidePct.toFixed(2)),
    drawdownPct: Number(entry.maxDrawdownPct.toFixed(2))
  }));
}

async function main() {
  const { dataset, filePath } = await loadDataset();
  const lastTestIndex = dataset.candles.length - FORWARD_CANDLES;

  console.log("[Three-Way Replay] Dataset:", filePath);
  console.log("[Three-Way Replay] Total candles:", dataset.candles.length);
  console.log(
    "[Three-Way Replay] Tested positions:",
    lastTestIndex - MIN_HISTORY
  );
  console.log("[Three-Way Replay] Forward candles:", FORWARD_CANDLES);

  console.log("\nRunning A — baseline...");
  const A = await replay(analyzeA, dataset, lastTestIndex);

  console.log("Running B — previous-close confirmation...");
  const B = await replay(analyzeB, dataset, lastTestIndex);

  console.log("Running C — previous-high confirmation...");
  const C = await replay(analyzeC, dataset, lastTestIndex);

  console.log("\n=== ALL-VARIANT SUMMARY ===");
  console.table([
    { variant: "A — Baseline", ...summarize(A.entries), errors: A.errors.length },
    { variant: "B — Previous close", ...summarize(B.entries), errors: B.errors.length },
    { variant: "C — Previous high", ...summarize(C.entries), errors: C.errors.length }
  ]);

  const AtoB = compare(A, B);
  const AtoC = compare(A, C);
  const BtoC = compare(B, C);

  console.log("\n=== A → B: EFFECT OF CURRENT FILTER ===");
  console.table([
    { category: "Retained", count: AtoB.retained.length },
    { category: "Removed", count: AtoB.removed.length },
    { category: "Added", count: AtoB.added.length }
  ]);

  console.log("\n=== A → C: EFFECT OF STRUCTURAL FILTER ===");
  console.table([
    { category: "Retained", count: AtoC.retained.length },
    { category: "Removed", count: AtoC.removed.length },
    { category: "Added", count: AtoC.added.length }
  ]);

  console.log("\n=== B → C: WHAT CHANGED BETWEEN FILTERS ===");
  console.table([
    { category: "Retained", count: BtoC.retained.length },
    { category: "Removed by C", count: BtoC.removed.length },
    { category: "Added by C", count: BtoC.added.length }
  ]);

  console.log("\n=== SIGNALS REMOVED BY C VS BASELINE ===");
  console.table(detailRows(AtoC.removed));

  console.log("\n=== SIGNALS RETAINED BY C VS BASELINE ===");
  console.table(detailRows(AtoC.retained));

  console.log("\n=== SIGNALS REMOVED BY C VS B ===");
  console.table(detailRows(BtoC.removed));

  console.log("\n=== SIGNALS ADDED BY C VS B ===");
  console.table(detailRows(BtoC.added));

  if (A.errors.length || B.errors.length || C.errors.length) {
    console.log("\n=== ANALYSIS ERRORS ===");
    console.log("A:", A.errors);
    console.log("B:", B.errors);
    console.log("C:", C.errors);
  }

  console.log(
    "\nInterpretation caution: the next 15 candles' high and low are " +
    "observed excursions, not realized returns. They do not model fees, " +
    "slippage, execution, or whether a stop was hit before a target. " +
    "Overlapping windows are not independent."
  );
}

main().catch((error) => {
  console.error("[Three-Way Replay] Failed:", error);
  process.exitCode = 1;
});
