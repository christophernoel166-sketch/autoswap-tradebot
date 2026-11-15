
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { analyzeChartEntry as analyzeA } from "./chartEntryService.baseline-replay.js";
import { analyzeChartEntry as analyzeB } from "./chartEntryService.js";
import { analyzeChartEntry as analyzeC } from "./chartEntryService.variantC-replay.js";
import { analyzeChartEntry as analyzeD } from "./chartEntryService.variantD-replay.js";

const DATA_DIR = path.resolve("data/chart-replay");
const FORWARD_CANDLES = 15;
const MIN_HISTORY = 100;

const VARIANTS = [
  ["A — Baseline", analyzeA],
  ["B — Previous close", analyzeB],
  ["C — Previous high", analyzeC],
  ["D — Strong close", analyzeD]
];

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
    entries.reduce((sum, entry) => sum + entry[field], 0) /
    entries.length;

  return {
    signals: entries.length,
    avgUpsidePct: Number(avg("maxUpsidePct").toFixed(2)),
    avgDrawdownPct: Number(avg("maxDrawdownPct").toFixed(2)),
    upsideAtLeast5Pct: entries.filter(
      (entry) => entry.maxUpsidePct >= 5
    ).length,
    upsideAtLeast10Pct: entries.filter(
      (entry) => entry.maxUpsidePct >= 10
    ).length,
    drawdownAtLeast5Pct: entries.filter(
      (entry) => entry.maxDrawdownPct <= -5
    ).length
  };
}

function validateDataset(dataset, file) {
  if (!Array.isArray(dataset.candles)) {
    throw new Error(`${file}: missing candles array.`);
  }

  if (
    !Number.isInteger(dataset.candles.length) ||
    dataset.candles.length <= MIN_HISTORY + FORWARD_CANDLES
  ) {
    throw new Error(`${file}: insufficient candles.`);
  }

  const invalidCandles = [];

  dataset.candles.forEach((candle, index) => {
    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);

    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      open <= 0 ||
      high <= 0 ||
      low <= 0 ||
      close <= 0 ||
      high < low ||
      high < open ||
      high < close ||
      low > open ||
      low > close
    ) {
      invalidCandles.push(index);
    }
  });

  if (invalidCandles.length) {
    throw new Error(
      `${file}: ${invalidCandles.length} invalid candles. ` +
      `First invalid indices: ${invalidCandles.slice(0, 10).join(", ")}`
    );
  }
}

async function replay(analyzer, dataset) {
  const candles = dataset.candles;
  const lastTestIndex = candles.length - FORWARD_CANDLES;
  const entries = [];
  const errors = [];

  for (
    let candleIndex = MIN_HISTORY;
    candleIndex < lastTestIndex;
    candleIndex++
  ) {
    const history = candles.slice(0, candleIndex + 1);

    try {
      const result = await analyzer(dataset.tokenMint, {
        timeframe: dataset.timeframe,
        limit: history.length,
        candles: history
      });

      if (!result?.ok) {
        errors.push({
          candleIndex,
          error:
            result?.error ??
            result?.message ??
            "Analysis unsuccessful"
        });
        continue;
      }

      if (result.action !== "enter_now") {
        continue;
      }

      const entryPrice = Number(
        result.metrics?.currentPrice ??
        history.at(-1)?.close
      );

      const future = candles.slice(
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

      const futureHigh = Math.max(
        ...future.map((candle) => Number(candle.high))
      );

      const futureLow = Math.min(
        ...future.map((candle) => Number(candle.low))
      );

      if (
        !Number.isFinite(futureHigh) ||
        !Number.isFinite(futureLow)
      ) {
        errors.push({
          candleIndex,
          error: "Invalid future candle prices."
        });
        continue;
      }

      entries.push({
        candleIndex,
        time: history.at(-1)?.time,
        setupType: result.setupType ?? "unknown",
        maxUpsidePct:
          ((futureHigh - entryPrice) / entryPrice) * 100,
        maxDrawdownPct:
          ((futureLow - entryPrice) / entryPrice) * 100
      });
    } catch (error) {
      errors.push({
        candleIndex,
        error: error?.message ?? String(error)
      });
    }
  }

  return {
    entries,
    errors,
    testedPositions: Math.max(
      0,
      lastTestIndex - MIN_HISTORY
    )
  };
}

async function main() {
  
const allFiles = (await readdir(DATA_DIR))
  .filter((file) => file.endsWith(".json"))
  .sort();

if (!allFiles.length) {
  throw new Error(`No datasets found in ${DATA_DIR}`);
}

// Keep the largest file for each token mint.
// This avoids counting repeated snapshots of the same token
// as separate token samples.
const largestFileByToken = new Map();

for (const file of allFiles) {
  const filePath = path.join(DATA_DIR, file);
  const dataset = JSON.parse(await readFile(filePath, "utf8"));

  const tokenMint = dataset.tokenMint ??
    file.match(/^(.+?)_1m_/)?.[1];

  if (!tokenMint) {
    console.warn(`Skipping file with unknown token mint: ${file}`);
    continue;
  }

  const previous = largestFileByToken.get(tokenMint);

  if (!previous || (await readFile(filePath)).length > previous.size) {
    const content = await readFile(filePath);

    largestFileByToken.set(tokenMint, {
      file,
      size: content.length
    });
  }
}

const files = [...largestFileByToken.values()]
  .map((item) => item.file)
  .sort();


  if (!files.length) {
    throw new Error(`No datasets found in ${DATA_DIR}`);
  }

  const overall = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);

    let dataset;

    try {
      dataset = JSON.parse(await readFile(filePath, "utf8"));
      validateDataset(dataset, file);
    } catch (error) {
      console.error(
        `\nSkipping dataset ${file}:`,
        error?.message ?? String(error)
      );
      continue;
    }

    console.log(`\n${"=".repeat(78)}`);
    console.log("DATASET:", file);
    console.log("Token:", dataset.tokenMint ?? "unknown");
    console.log("Timeframe:", dataset.timeframe ?? "unknown");
    console.log("Candles:", dataset.candles.length);
    console.log(
      "Tested positions:",
      dataset.candles.length - FORWARD_CANDLES - MIN_HISTORY
    );

    const results = [];

    for (const [name, analyzer] of VARIANTS) {
      console.log(`Running ${name}...`);

      const result = await replay(analyzer, dataset);

      results.push({
        name,
        ...result
      });

      overall.push({
        dataset: file,
        variant: name,
        ...summarize(result.entries),
        errors: result.errors.length
      });
    }

    console.log("\nDataset results:");

    console.table(
      results.map((result) => ({
        variant: result.name,
        ...summarize(result.entries),
        testedPositions: result.testedPositions,
        errors: result.errors.length
      }))
    );

    const errors = results
      .filter((result) => result.errors.length > 0)
      .map((result) => ({
        variant: result.name,
        errors: result.errors
      }));

    if (errors.length) {
      console.log("\nAnalysis errors:");
      console.dir(errors, { depth: null });
    }
  }

  console.log(`\n${"=".repeat(78)}`);
  console.log("ALL DATASETS — RESULTS KEPT SEPARATE");
  console.table(overall);

  console.log(
    "\nCaution: upside and drawdown are observed high/low excursions " +
    "over the next 15 candles, not realized returns. Fees, slippage, " +
    "stop/target ordering, and execution are not modeled. The two " +
    "current datasets overlap and represent the same token, so they " +
    "are not independent samples."
  );
}

main().catch((error) => {
  console.error("[Multi-dataset replay] Failed:", error);
  process.exitCode = 1;
});
