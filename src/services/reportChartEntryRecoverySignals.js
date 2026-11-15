
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { analyzeChartEntry as analyzeA } from "./chartEntryService.baseline-replay.js";
import { analyzeChartEntry as analyzeB } from "./chartEntryService.js";
import { analyzeChartEntry as analyzeC } from "./chartEntryService.variantC-replay.js";
import { analyzeChartEntry as analyzeD } from "./chartEntryService.variantD-replay.js";

const DATA_DIR = path.resolve("data/chart-replay");
const MIN_HISTORY = 100;
const FORWARD_CANDLES = 15;
const VARIANTS = [
  { key: "A", name: "Baseline", analyze: analyzeA },
  { key: "B", name: "Previous close", analyze: analyzeB },
  { key: "C", name: "Previous high", analyze: analyzeC },
  { key: "D", name: "Strong close", analyze: analyzeD },
];

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n") + "\r\n";
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function outcome(candles, index, entryPrice) {
  const future = candles.slice(index + 1, index + 1 + FORWARD_CANDLES);

  if (
    future.length !== FORWARD_CANDLES ||
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0
  ) {
    return {
      maxUpsidePct: null,
      maxDrawdownPct: null,
      outcomeClass: "not_available",
    };
  }

  const high = Math.max(...future.map((c) => Number(c.high)));
  const low = Math.min(...future.map((c) => Number(c.low)));
  const upside = ((high - entryPrice) / entryPrice) * 100;
  const drawdown = ((low - entryPrice) / entryPrice) * 100;

  let outcomeClass = "mixed_or_neutral";
  if (upside >= 5 && drawdown <= -5) {
    outcomeClass = "both_up_5pct_and_down_5pct";
  } else if (upside >= 5) {
    outcomeClass = "upside_at_least_5pct";
  } else if (drawdown <= -5) {
    outcomeClass = "drawdown_at_least_5pct";
  }

  return {
    maxUpsidePct: round(upside),
    maxDrawdownPct: round(drawdown),
    outcomeClass,
  };
}

async function analyzeAt(analyzer, dataset, index) {
  const history = dataset.candles.slice(0, index + 1);

  try {
    const result = await analyzer(dataset.tokenMint, {
      timeframe: dataset.timeframe,
      limit: history.length,
      candles: history,
    });

    if (!result?.ok) {
      return {
        signal: false,
        error: result?.error ?? result?.message ?? "Analysis unsuccessful",
      };
    }

    const price = Number(
      result.metrics?.currentPrice ?? history.at(-1)?.close
    );

    return {
      signal: result.action === "enter_now",
      action: result.action ?? null,
      setupType: result.setupType ?? "unknown",
      score: result.score ?? null,
      entryPrice: Number.isFinite(price) && price > 0 ? price : null,
      error: null,
    };
  } catch (error) {
    return {
      signal: false,
      action: null,
      setupType: null,
      score: null,
      entryPrice: null,
      error: error?.message ?? String(error),
    };
  }
}

function validate(dataset, file) {
  if (!Array.isArray(dataset.candles)) {
    throw new Error(`${file}: missing candles array`);
  }
  if (dataset.candles.length <= MIN_HISTORY + FORWARD_CANDLES) {
    throw new Error(`${file}: insufficient candles`);
  }

  dataset.candles.forEach((c, i) => {
    const { open, high, low, close } = Object.fromEntries(
      ["open", "high", "low", "close"].map((k) => [k, Number(c[k])])
    );

    if (
      ![open, high, low, close].every(Number.isFinite) ||
      open <= 0 || high <= 0 || low <= 0 || close <= 0 ||
      high < low || high < open || high < close ||
      low > open || low > close
    ) {
      throw new Error(`${file}: invalid OHLC candle at index ${i}`);
    }
  });
}

async function replayDataset(dataset, file) {
  validate(dataset, file);

  const rows = [];
  const errors = [];
  const lastIndex = dataset.candles.length - FORWARD_CANDLES;

  console.log(`\nDataset: ${file}`);
  console.log(`Token: ${dataset.tokenMint}; candles: ${dataset.candles.length}`);

  for (let index = MIN_HISTORY; index < lastIndex; index++) {
    if ((index - MIN_HISTORY) % 50 === 0) {
      console.log(`  Tested ${index - MIN_HISTORY}/${lastIndex - MIN_HISTORY}`);
    }

    const candle = dataset.candles[index];
    const close = Number(candle.close);

    // Use the same candle-close reference price to classify opportunities
    // accepted or rejected by any variant.
    const sharedOutcome = outcome(dataset.candles, index, close);

    const row = {
      dataset: file,
      tokenMint: dataset.tokenMint ?? "",
      timeframe: dataset.timeframe ?? "",
      candleIndex: index,
      time: candle.time ?? "",
      referenceClose: close,
      referenceMaxUpsidePct: sharedOutcome.maxUpsidePct,
      referenceMaxDrawdownPct: sharedOutcome.maxDrawdownPct,
      outcomeClass: sharedOutcome.outcomeClass,
    };

    for (const variant of VARIANTS) {
      const result = await analyzeAt(variant.analyze, dataset, index);
      const prefix = variant.key;

      row[`${prefix}_signal`] = result.signal;
      row[`${prefix}_action`] = result.action ?? "";
      row[`${prefix}_setupType`] = result.setupType ?? "";
      row[`${prefix}_score`] = result.score ?? "";
      row[`${prefix}_entryPrice`] = result.entryPrice ?? "";
      row[`${prefix}_error`] = result.error ?? "";

      const variantOutcome = result.signal
        ? outcome(dataset.candles, index, result.entryPrice ?? close)
        : { maxUpsidePct: null, maxDrawdownPct: null };

      row[`${prefix}_maxUpsidePct`] = variantOutcome.maxUpsidePct;
      row[`${prefix}_maxDrawdownPct`] = variantOutcome.maxDrawdownPct;

      if (result.error) {
        errors.push({
          dataset: file,
          candleIndex: index,
          time: row.time,
          variant: prefix,
          error: result.error,
        });
      }
    }

    row.baselineSignal = row.A_signal;
    row.B_rejectedBaselineSignal = row.A_signal && !row.B_signal;
    row.C_rejectedBaselineSignal = row.A_signal && !row.C_signal;
    row.D_rejectedBaselineSignal = row.A_signal && !row.D_signal;

    rows.push(row);
  }

  return { rows, errors };
}

function summarize(rows, variant) {
  const signals = rows.filter((r) => r[`${variant}_signal`]);
  const average = (key) => signals.length
    ? round(signals.reduce((sum, r) => sum + r[key], 0) / signals.length)
    : null;

  return {
    tokenMint: rows[0]?.tokenMint ?? "",
    variant,
    signalCount: signals.length,
    avgMaxUpsidePct: average(`${variant}_maxUpsidePct`),
    avgMaxDrawdownPct: average(`${variant}_maxDrawdownPct`),
    upsideAtLeast5Pct: signals.filter(
      (r) => r[`${variant}_maxUpsidePct`] >= 5
    ).length,
    drawdownAtLeast5Pct: signals.filter(
      (r) => r[`${variant}_maxDrawdownPct`] <= -5
    ).length,
    analysisErrors: rows.filter((r) => r[`${variant}_error`]).length,
  };
}

async function main() {
  const files = (await readdir(DATA_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (!files.length) throw new Error(`No datasets found in ${DATA_DIR}`);

  // Match the existing runner's rule: largest JSON file per token mint.
  const largestByToken = new Map();

  for (const file of files) {
    const content = await readFile(path.join(DATA_DIR, file));
    const dataset = JSON.parse(content.toString("utf8"));
    const mint = dataset.tokenMint ?? file.match(/^(.+?)_1m_/)?.[1];

    if (!mint) {
      console.warn(`Skipping unknown token mint: ${file}`);
      continue;
    }

    const previous = largestByToken.get(mint);
    if (!previous || content.length > previous.size) {
      largestByToken.set(mint, { file, size: content.length });
    }
  }

  const selectedFiles = [...largestByToken.values()]
    .map((item) => item.file)
    .sort();

  const allRows = [];
  const allErrors = [];
  const summaries = [];

  for (const file of selectedFiles) {
    try {
      const dataset = JSON.parse(
        await readFile(path.join(DATA_DIR, file), "utf8")
      );
      const { rows, errors } = await replayDataset(dataset, file);
      allRows.push(...rows);
      allErrors.push(...errors);

      for (const variant of VARIANTS) {
        summaries.push(summarize(rows, variant.key));
      }
    } catch (error) {
      console.error(`Skipping ${file}:`, error?.message ?? String(error));
    }
  }

  if (!allRows.length) throw new Error("No valid candle positions processed");

  // Only baseline signals are used to judge which opportunities the stricter
  // variants rejected. Every outcome is measured from the same candle close.
  const baselineSignals = allRows.filter((r) => r.A_signal);
  const rejectionRows = [];

  for (const variant of VARIANTS.filter((v) => v.key !== "A")) {
    const rejected = baselineSignals.filter((r) => !r[`${variant.key}_signal`]);
    const retained = baselineSignals.filter((r) => r[`${variant.key}_signal`]);

    for (const row of rejected) {
      rejectionRows.push({
        dataset: row.dataset,
        tokenMint: row.tokenMint,
        candleIndex: row.candleIndex,
        time: row.time,
        comparison: `A_vs_${variant.key}`,
        decision: "REJECTED_BY_VARIANT",
        referenceClose: row.referenceClose,
        maxUpsidePct: row.referenceMaxUpsidePct,
        maxDrawdownPct: row.referenceMaxDrawdownPct,
        outcomeClass: row.outcomeClass,
      });
    }

    for (const row of retained) {
      rejectionRows.push({
        dataset: row.dataset,
        tokenMint: row.tokenMint,
        candleIndex: row.candleIndex,
        time: row.time,
        comparison: `A_vs_${variant.key}`,
        decision: "RETAINED_BY_VARIANT",
        referenceClose: row.referenceClose,
        maxUpsidePct: row.referenceMaxUpsidePct,
        maxDrawdownPct: row.referenceMaxDrawdownPct,
        outcomeClass: row.outcomeClass,
      });
    }

    const classify = (subset) => ({
      count: subset.length,
      upsideAtLeast5Pct: subset.filter(
        (r) => r.referenceMaxUpsidePct >= 5
      ).length,
      drawdownAtLeast5Pct: subset.filter(
        (r) => r.referenceMaxDrawdownPct <= -5
      ).length,
      avgUpsidePct: subset.length ? round(
        subset.reduce((s, r) => s + r.referenceMaxUpsidePct, 0) / subset.length
      ) : null,
      avgDrawdownPct: subset.length ? round(
        subset.reduce((s, r) => s + r.referenceMaxDrawdownPct, 0) / subset.length
      ) : null,
    });

    console.log(`\n=== Baseline signals: A vs ${variant.key} ===`);
    console.table([
      { group: "Retained", ...classify(retained) },
      { group: "Rejected", ...classify(rejected) },
    ]);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const detailPath = path.join(DATA_DIR, `signal-detail-${stamp}.csv`);
  const summaryPath = path.join(DATA_DIR, `signal-summary-${stamp}.csv`);
  const rejectionPath = path.join(DATA_DIR, `signal-rejections-${stamp}.csv`);
  const jsonPath = path.join(DATA_DIR, `signal-detail-${stamp}.json`);

  await writeFile(detailPath, toCsv(allRows), "utf8");
  await writeFile(summaryPath, toCsv(summaries), "utf8");
  await writeFile(rejectionPath, toCsv(rejectionRows), "utf8");
  await writeFile(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    settings: {
      minHistory: MIN_HISTORY,
      forwardCandles: FORWARD_CANDLES,
      datasetSelection: "largest JSON file per token mint",
      sharedOutcomeReference: "signal candle close",
      thresholds: { upsidePct: 5, drawdownPct: -5 },
      caveat: "Excursions are not realized returns; windows overlap.",
    },
    datasets: selectedFiles,
    summaries,
    errors: allErrors,
    rows: allRows,
  }, null, 2), "utf8");

  console.log("\n=== SIGNAL SUMMARY ===");
  console.table(summaries);

  console.log("\n=== REPORTS CREATED ===");
  console.log("Detailed candle-by-candle report:", detailPath);
  console.log("Per-token/variant summary:", summaryPath);
  console.log("Baseline signals retained/rejected:", rejectionPath);
  console.log("Complete JSON report:", jsonPath);
  console.log("Analysis errors:", allErrors.length);

  console.log(
    "\nCaution: future high/low excursions are not realized returns. " +
    "Fees, slippage, stop/target ordering, and execution are not modeled. " +
    "Overlapping windows are not independent. The shared reference-close " +
    "outcome is used to compare accepted and rejected opportunities fairly."
  );
}

main().catch((error) => {
  console.error("[Signal detail report] Failed:", error);
  process.exitCode = 1;
});
