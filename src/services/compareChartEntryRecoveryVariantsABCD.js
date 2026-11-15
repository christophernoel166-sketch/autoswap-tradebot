
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { analyzeChartEntry as analyzeA } from "./chartEntryService.baseline-replay.js";
import { analyzeChartEntry as analyzeB } from "./chartEntryService.js";
import { analyzeChartEntry as analyzeC } from "./chartEntryService.variantC-replay.js";
import { analyzeChartEntry as analyzeD } from "./chartEntryService.variantD-replay.js";

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

function signalKey(entry) {
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
      upsideAtLeast10Pct: 0,
      drawdownAtLeast5Pct: 0
    };
  }

  const avg = (field) =>
    entries.reduce((sum, e) => sum + e[field], 0) / entries.length;

  return {
    signals: entries.length,
    avgUpsidePct: Number(avg("maxUpsidePct").toFixed(2)),
    avgDrawdownPct: Number(avg("maxDrawdownPct").toFixed(2)),
    upsideAtLeast5Pct: entries.filter((e) => e.maxUpsidePct >= 5).length,
    upsideAtLeast10Pct: entries.filter((e) => e.maxUpsidePct >= 10).length,
    drawdownAtLeast5Pct: entries.filter((e) => e.maxDrawdownPct <= -5).length
  };
}

function compare(reference, candidate) {
  const refMap = new Map(
    reference.entries.map((e) => [signalKey(e), e])
  );
  const candidateMap = new Map(
    candidate.entries.map((e) => [signalKey(e), e])
  );

  const retained = [];
  const removed = [];
  const added = [];

  for (const [key, entry] of refMap) {
    if (candidateMap.has(key)) retained.push(entry);
    else removed.push(entry);
  }

  for (const [key, entry] of candidateMap) {
    if (!refMap.has(key)) added.push(entry);
  }

  return { retained, removed, added };
}

function detailRows(entries) {
  return entries.map((e) => ({
    candleIndex: e.candleIndex,
    time: e.time,
    setupType: e.setupType,
    score: e.score,
    upsidePct: Number(e.maxUpsidePct.toFixed(2)),
    drawdownPct: Number(e.maxDrawdownPct.toFixed(2))
  }));
}

function printComparison(title, result) {
  console.log(`\n=== ${title} ===`);
  console.table([
    { category: "Retained", count: result.retained.length },
    { category: "Removed", count: result.removed.length },
    { category: "Added", count: result.added.length }
  ]);
}

async function main() {
  const { dataset, filePath } = await loadDataset();
  const lastTestIndex = dataset.candles.length - FORWARD_CANDLES;

  console.log("[ABCD Replay] Dataset:", filePath);
  console.log("[ABCD Replay] Candles:", dataset.candles.length);
  console.log("[ABCD Replay] Tested positions:", lastTestIndex - MIN_HISTORY);
  console.log("[ABCD Replay] Forward window:", FORWARD_CANDLES);

  console.log("\nRunning A — baseline...");
  const A = await replay(analyzeA, dataset, lastTestIndex);

  console.log("Running B — previous-close confirmation...");
  const B = await replay(analyzeB, dataset, lastTestIndex);

  console.log("Running C — previous-high confirmation...");
  const C = await replay(analyzeC, dataset, lastTestIndex);

  console.log("Running D — strong candle-close confirmation...");
  const D = await replay(analyzeD, dataset, lastTestIndex);

  console.log("\n=== ALL-VARIANT SUMMARY ===");
  console.table([
    { variant: "A — Baseline", ...summarize(A.entries), errors: A.errors.length },
    { variant: "B — Previous close", ...summarize(B.entries), errors: B.errors.length },
    { variant: "C — Previous high", ...summarize(C.entries), errors: C.errors.length },
    { variant: "D — Strong close", ...summarize(D.entries), errors: D.errors.length }
  ]);

  const AtoB = compare(A, B);
  const AtoC = compare(A, C);
  const AtoD = compare(A, D);
  const BtoD = compare(B, D);
  const CtoD = compare(C, D);

  printComparison("A → B", AtoB);
  printComparison("A → C", AtoC);
  printComparison("A → D", AtoD);
  printComparison("B → D", BtoD);
  printComparison("C → D", CtoD);

  console.log("\n=== SIGNALS REMOVED BY D VS BASELINE ===");
  console.table(detailRows(AtoD.removed));

  console.log("\n=== SIGNALS RETAINED BY D VS BASELINE ===");
  console.table(detailRows(AtoD.retained));

  console.log("\n=== SIGNALS REMOVED BY D VS B ===");
  console.table(detailRows(BtoD.removed));

  console.log("\n=== SIGNALS ADDED BY D VS B ===");
  console.table(detailRows(BtoD.added));

  const all = [
    ["A", A],
    ["B", B],
    ["C", C],
    ["D", D]
  ];

  const errors = all
    .filter(([, result]) => result.errors.length > 0)
    .map(([name, result]) => ({
      variant: name,
      errors: result.errors
    }));

  if (errors.length) {
    console.log("\n=== ANALYSIS ERRORS ===");
    console.dir(errors, { depth: null });
  }

  console.log(
    "\nCaution: these are observed high/low excursions over the next " +
    "15 candles, not realized returns. Fees, slippage, stop/target ordering, " +
    "and execution are not modeled. Overlapping windows are not independent."
  );
}

main().catch((error) => {
  console.error("[ABCD Replay] Failed:", error);
  process.exitCode = 1;
});
