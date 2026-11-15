
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  analyzeChartEntry as analyzeBaseline
} from "./chartEntryService.baseline-replay.js";

import {
  analyzeChartEntry as analyzeUpdated
} from "./chartEntryService.js";

const DATA_DIR = path.resolve("data/chart-replay");
const FORWARD_CANDLES = 15;
const MIN_HISTORY = 100;

async function loadDataset() {
  const files = (await readdir(DATA_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No candle datasets found in ${DATA_DIR}`);
  }

  const filePath = path.join(DATA_DIR, files[files.length - 1]);
  const dataset = JSON.parse(await readFile(filePath, "utf8"));

  if (
    !Array.isArray(dataset.candles) ||
    dataset.candles.length <= MIN_HISTORY + FORWARD_CANDLES
  ) {
    throw new Error("The selected dataset does not contain enough candles.");
  }

  return { dataset, filePath };
}

function getEntryKey(entry) {
  return `${entry.candleIndex}:${entry.setupType ?? "unknown"}`;
}

async function analyzeVersion(analyzer, dataset, candles, lastTestIndex) {
  const entries = [];
  const errors = [];

  for (
    let endIndex = MIN_HISTORY;
    endIndex < lastTestIndex;
    endIndex++
  ) {
    const history = candles.slice(0, endIndex + 1);

    let result;

    try {
      result = await analyzer(dataset.tokenMint, {
        timeframe: dataset.timeframe,
        limit: history.length,
        candles: history
      });
    } catch (error) {
      errors.push({
        candleIndex: endIndex,
        error: error?.message ?? String(error)
      });
      continue;
    }

    if (!result?.ok) {
      errors.push({
        candleIndex: endIndex,
        error: result?.error ?? result?.message ?? "Analysis unsuccessful"
      });
      continue;
    }

    if (result.action !== "enter_now") {
      continue;
    }

    const entryPrice = Number(
      result.metrics?.currentPrice ?? history.at(-1)?.close
    );

    const futureCandles = candles.slice(
      endIndex + 1,
      endIndex + 1 + FORWARD_CANDLES
    );

    if (
      !Number.isFinite(entryPrice) ||
      entryPrice <= 0 ||
      futureCandles.length !== FORWARD_CANDLES
    ) {
      continue;
    }

    const futureHigh = Math.max(
      ...futureCandles.map((candle) => Number(candle.high))
    );

    const futureLow = Math.min(
      ...futureCandles.map((candle) => Number(candle.low))
    );

    entries.push({
      candleIndex: endIndex,
      time: history.at(-1)?.time,
      setupType: result.setupType ?? "unknown",
      score: result.score ?? null,
      confidence: result.confidence ?? null,
      entryPrice,
      maxUpsidePct: ((futureHigh - entryPrice) / entryPrice) * 100,
      maxDrawdownPct: ((futureLow - entryPrice) / entryPrice) * 100
    });
  }

  return { entries, errors };
}

function summarize(entries) {
  if (entries.length === 0) {
    return {
      count: 0,
      avgUpsidePct: null,
      avgDrawdownPct: null,
      upsideAtLeast5Pct: 0,
      drawdownAtLeast5Pct: 0
    };
  }

  const average = (field) =>
    entries.reduce((sum, item) => sum + item[field], 0) / entries.length;

  return {
    count: entries.length,
    avgUpsidePct: Number(average("maxUpsidePct").toFixed(2)),
    avgDrawdownPct: Number(average("maxDrawdownPct").toFixed(2)),
    upsideAtLeast5Pct: entries.filter(
      (item) => item.maxUpsidePct >= 5
    ).length,
    drawdownAtLeast5Pct: entries.filter(
      (item) => item.maxDrawdownPct <= -5
    ).length
  };
}

async function main() {
  const { dataset, filePath } = await loadDataset();
  const candles = dataset.candles;
  const lastTestIndex = candles.length - FORWARD_CANDLES;
  const testedPositions = lastTestIndex - MIN_HISTORY;

  console.log("[Recovery Filter A/B] Dataset:", filePath);
  console.log("[Recovery Filter A/B] Candles:", candles.length);
  console.log("[Recovery Filter A/B] Tested positions:", testedPositions);
  console.log("[Recovery Filter A/B] Forward window:", FORWARD_CANDLES);
  console.log("[Recovery Filter A/B] Running baseline...");

  const baseline = await analyzeVersion(
    analyzeBaseline,
    dataset,
    candles,
    lastTestIndex
  );

  console.log("[Recovery Filter A/B] Running updated analyzer...");

  const updated = await analyzeVersion(
    analyzeUpdated,
    dataset,
    candles,
    lastTestIndex
  );

  const baselineMap = new Map(
    baseline.entries.map((entry) => [getEntryKey(entry), entry])
  );

  const updatedMap = new Map(
    updated.entries.map((entry) => [getEntryKey(entry), entry])
  );

  const retained = [];
  const removed = [];
  const added = [];

  for (const [key, entry] of baselineMap) {
    if (updatedMap.has(key)) {
      retained.push({
        ...entry,
        updatedScore: updatedMap.get(key).score
      });
    } else {
      removed.push(entry);
    }
  }

  for (const [key, entry] of updatedMap) {
    if (!baselineMap.has(key)) {
      added.push(entry);
    }
  }

  console.log("\n=== SIGNAL COMPARISON ===");
  console.table([
    {
      category: "Baseline signals",
      count: baseline.entries.length
    },
    {
      category: "Updated signals",
      count: updated.entries.length
    },
    {
      category: "Retained by both",
      count: retained.length
    },
    {
      category: "Removed by filter",
      count: removed.length
    },
    {
      category: "Added in updated version",
      count: added.length
    },
    {
      category: "Baseline analysis errors",
      count: baseline.errors.length
    },
    {
      category: "Updated analysis errors",
      count: updated.errors.length
    }
  ]);

  console.log("\n=== OUTCOME SUMMARY ===");
  console.table([
    {
      group: "Baseline — all signals",
      ...summarize(baseline.entries)
    },
    {
      group: "Updated — all signals",
      ...summarize(updated.entries)
    },
    {
      group: "Retained signals",
      ...summarize(retained)
    },
    {
      group: "Removed signals",
      ...summarize(removed)
    },
    {
      group: "Added signals",
      ...summarize(added)
    }
  ]);

  const detailColumns = (entries) =>
    entries.map((entry) => ({
      candleIndex: entry.candleIndex,
      time: entry.time,
      setupType: entry.setupType,
      score: entry.score,
      maxUpsidePct: Number(entry.maxUpsidePct.toFixed(2)),
      maxDrawdownPct: Number(entry.maxDrawdownPct.toFixed(2))
    }));

  console.log("\n=== REMOVED SIGNALS ===");
  console.table(detailColumns(removed));

  console.log("\n=== RETAINED SIGNALS ===");
  console.table(detailColumns(retained));

  console.log("\n=== ADDED SIGNALS ===");
  console.table(detailColumns(added));

  if (baseline.errors.length || updated.errors.length) {
    console.log("\n=== ANALYSIS ERRORS ===");
    console.log("Baseline errors:", baseline.errors);
    console.log("Updated errors:", updated.errors);
  }

  console.log(
    "\nImportant: upside and drawdown are observed price excursions over " +
    "the next 15 candles, not realized trade returns. This comparison " +
    "does not model fees, slippage, stop/target order, or trade execution. " +
    "Overlapping signal windows are not independent."
  );
}

main().catch((error) => {
  console.error("[Recovery Filter A/B] Failed:", error);
  process.exitCode = 1;
});
