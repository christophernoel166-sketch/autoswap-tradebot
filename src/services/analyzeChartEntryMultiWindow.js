
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data/chart-replay");

const WINDOWS = [5, 15, 30, 60];
const UPSIDE_TARGETS = [5, 10, 20, 30];
const DOWNSIDE_TARGET_PCT = -5;
const VARIANTS = ["A", "B", "C", "D"];
const MINUTE_MS = 60_000;

function newestFile(prefix) {
  const files = fs.readdirSync(DATA_DIR)
    .filter(name => name.startsWith(prefix) && name.endsWith(".csv"))
    .sort()
    .reverse();

  if (!files.length) {
    throw new Error(`No ${prefix}*.csv report found in ${DATA_DIR}`);
  }

  return path.join(DATA_DIR, files[0]);
}

function parseCsvLine(line) {
  const cells = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  cells.push(value);
  return cells;
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "");

  const lines = text.split(/\r?\n/).filter(line => line.length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });

    return row;
  });
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }

  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];

  const escape = value => {
    if (value === null || value === undefined) return "";

    const text = Array.isArray(value)
      ? value.join(";")
      : String(value);

    return /[",\r\n]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map(row =>
      headers.map(header => escape(row[header])).join(",")
    )
  ];

  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

function loadDatasets() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(name =>
      name.endsWith(".json") &&
      !name.startsWith("signal-") &&
      !name.startsWith("multi-window-")
    );

  const datasets = new Map();

  for (const name of files) {
    const fullPath = path.join(DATA_DIR, name);

    try {
      const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));

      if (!Array.isArray(parsed.candles)) {
        console.warn(`[Skip] No candles array in ${name}`);
        continue;
      }

      const candles = parsed.candles
        .map(candle => ({
          time: Number(candle.time),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
          volume: Number(candle.volume)
        }))
        .filter(candle =>
          Number.isFinite(candle.time) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close) &&
          candle.open > 0 &&
          candle.high > 0 &&
          candle.low > 0 &&
          candle.close > 0 &&
          candle.high >= candle.low
        )
        .sort((a, b) => a.time - b.time);

      // The report's candleIndex must refer to the original candle array.
      // Do not silently remove invalid candles and shift the indices.
      if (candles.length !== parsed.candles.length) {
        console.warn(
          `[Skip] Invalid candle(s) in ${name}; preserving index integrity`
        );
        continue;
      }

      // Duplicate timestamps make candle indexing and window coverage
      // ambiguous, so skip such datasets instead of guessing.
      const hasDuplicateTimes = candles.some(
        (candle, index) =>
          index > 0 && candle.time === candles[index - 1].time
      );

      if (hasDuplicateTimes) {
        console.warn(`[Skip] Duplicate candle timestamps in ${name}`);
        continue;
      }

      datasets.set(name, candles);
    } catch (error) {
      console.warn(`[Skip] Could not read ${name}: ${error.message}`);
    }
  }

  return datasets;
}

function percentChange(price, entryPrice) {
  return ((price - entryPrice) / entryPrice) * 100;
}

function evaluateWindow(candles, signalIndex, entryPrice, windowMinutes) {
  const result = {
    windowMinutes,
    complete: false,
    candlesObserved: 0,
    missingMinutes: null,
    maxUpsidePct: null,
    maxDrawdownPct: null,
    peakPrice: null,
    peakTime: null,
    minutesToPeak: null,
    windowEndClose: null,
    retracementFromPeakPct: null,
    firstDown5Offset: null,
    thresholdOrder5: "INCOMPLETE",
    up5Outcome: "INCOMPLETE",
    up10Outcome: "INCOMPLETE",
    up20Outcome: "INCOMPLETE",
    up30Outcome: "INCOMPLETE"
  };

  if (!Number.isInteger(signalIndex) ||
      signalIndex < 0 ||
      signalIndex >= candles.length) {
    result.thresholdOrder5 = "INVALID_SIGNAL_INDEX";
    return result;
  }

  if (!(entryPrice > 0) || !Number.isFinite(entryPrice)) {
    result.thresholdOrder5 = "INVALID_ENTRY_PRICE";
    return result;
  }

  const signalCandle = candles[signalIndex];
  const signalTime = signalCandle.time;
  const endTime = signalTime + windowMinutes * MINUTE_MS;

  // The signal candle itself is excluded from forward outcomes.
  // A signal at time T uses candles T+1 minute through T+window.
  const future = [];

  for (let i = signalIndex + 1; i < candles.length; i++) {
    if (candles[i].time > endTime) break;
    future.push(candles[i]);
  }

  result.candlesObserved = future.length;

  // Require every expected minute. Do not classify a partial window
  // as a losing or successful outcome.
  const expectedCount = windowMinutes;
  const hasFullCoverage =
    future.length >= expectedCount &&
    future.slice(0, expectedCount).every((candle, i) => {
      const expectedTime = signalTime + (i + 1) * MINUTE_MS;
      return candle.time === expectedTime;
    });

  result.complete = hasFullCoverage;
  result.missingMinutes = hasFullCoverage
    ? 0
    : Math.max(0, expectedCount - future.length);

  if (!future.length) return result;

  const observed = future.slice(0, expectedCount);

  let maxHigh = -Infinity;
  let minLow = Infinity;
  let peakCandle = null;

  // Each target is evaluated independently against the downside barrier.
  const targetOffsets = Object.fromEntries(
    UPSIDE_TARGETS.map(target => [target, null])
  );

  let down5Offset = null;

  for (let i = 0; i < observed.length; i++) {
    const candle = observed[i];

    if (candle.high > maxHigh) {
      maxHigh = candle.high;
      peakCandle = candle;
    }

    if (candle.low < minLow) {
      minLow = candle.low;
    }

    // Record the first candle whose high touches each upside target.
    for (const target of UPSIDE_TARGETS) {
      if (
        targetOffsets[target] === null &&
        candle.high >= entryPrice * (1 + target / 100)
      ) {
        targetOffsets[target] = i;
      }
    }

    if (
      down5Offset === null &&
      candle.low <= entryPrice * (1 + DOWNSIDE_TARGET_PCT / 100)
    ) {
      down5Offset = i;
    }
  }

  result.maxUpsidePct = Number(
    percentChange(maxHigh, entryPrice).toFixed(4)
  );

  result.maxDrawdownPct = Number(
    percentChange(minLow, entryPrice).toFixed(4)
  );

  result.peakPrice = maxHigh;
  result.peakTime = peakCandle?.time ?? null;

  result.minutesToPeak = peakCandle
    ? (peakCandle.time - signalTime) / MINUTE_MS
    : null;

  const lastCandle = observed[observed.length - 1];
  result.windowEndClose = lastCandle?.close ?? null;

  if (maxHigh > 0 && lastCandle) {
    result.retracementFromPeakPct = Number(
      (((maxHigh - lastCandle.close) / maxHigh) * 100).toFixed(4)
    );
  }

  result.firstDown5Offset = down5Offset === null
    ? null
    : down5Offset + 1;

  // A complete window is required before we assign final outcomes.
  if (!result.complete) {
    return result;
  }

  for (const target of UPSIDE_TARGETS) {
    const targetOffset = targetOffsets[target];
    const outcomeKey = `up${target}Outcome`;

    if (targetOffset === null && down5Offset === null) {
      result[outcomeKey] = "NEITHER";
    } else if (targetOffset === null) {
      result[outcomeKey] = "DOWN_FIRST";
    } else if (down5Offset === null) {
      result[outcomeKey] = "TARGET_FIRST";
    } else if (targetOffset < down5Offset) {
      result[outcomeKey] = "TARGET_FIRST";
    } else if (down5Offset < targetOffset) {
      result[outcomeKey] = "DOWN_FIRST";
    } else {
      // Both target and downside barrier were inside the same candle.
      result[outcomeKey] = "AMBIGUOUS_SAME_CANDLE";
    }
  }

  if (result.up5Outcome === "TARGET_FIRST") {
    result.thresholdOrder5 = "UP_FIRST";
  } else if (result.up5Outcome === "DOWN_FIRST") {
    result.thresholdOrder5 = "DOWN_FIRST";
  } else if (result.up5Outcome === "AMBIGUOUS_SAME_CANDLE") {
    result.thresholdOrder5 = "AMBIGUOUS_SAME_CANDLE";
  } else {
    result.thresholdOrder5 = "NEITHER";
  }

  return result;
}

function mean(rows, key) {
  const values = rows
    .map(row => Number(row[key]))
    .filter(value => Number.isFinite(value));

  if (!values.length) return null;

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length)
      .toFixed(4)
  );
}

function countOutcome(rows, outcomeKey, outcome) {
  return rows.filter(row => row[outcomeKey] === outcome).length;
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`Data directory does not exist: ${DATA_DIR}`);
  }

  const signalPath = newestFile("signal-detail-");
  const signalRows = readCsv(signalPath);
  const datasets = loadDatasets();

  console.log(`[Input] Signal report: ${path.basename(signalPath)}`);
  console.log(`[Input] Loaded datasets: ${datasets.size}`);
  console.log(`[Input] Signal report rows: ${signalRows.length}`);

  const detailed = [];
  const qualifying = [];
  const seenSignals = new Set();

  let missingDatasetRows = 0;
  let invalidIndexRows = 0;
  let duplicateSignalRows = 0;
  let invalidEntryRows = 0;

  for (const row of signalRows) {
    const candles = datasets.get(row.dataset);

    if (!candles) {
      missingDatasetRows++;
      continue;
    }

    const index = Number(row.candleIndex);

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= candles.length
    ) {
      invalidIndexRows++;
      continue;
    }

    for (const variant of VARIANTS) {
      if (String(row[`${variant}_signal`]).toLowerCase() !== "true") {
        continue;
      }

      const entryPrice = Number(row[`${variant}_entryPrice`]);

      if (!(entryPrice > 0) || !Number.isFinite(entryPrice)) {
        invalidEntryRows++;
        continue;
      }

      const signalKey = [
        row.dataset,
        row.tokenMint,
        index,
        variant
      ].join("|");

      if (seenSignals.has(signalKey)) {
        duplicateSignalRows++;
        continue;
      }

      seenSignals.add(signalKey);

      for (const windowMinutes of WINDOWS) {
        const outcome = evaluateWindow(
          candles,
          index,
          entryPrice,
          windowMinutes
        );

        const record = {
          dataset: row.dataset,
          tokenMint: row.tokenMint,
          timeframe: row.timeframe,
          candleIndex: index,
          signalTime: candles[index].time,
          variant,
          action: row[`${variant}_action`],
          setupType: row[`${variant}_setupType`],
          score: row[`${variant}_score`],
          entryPrice,
          ...outcome
        };

        detailed.push(record);

        if (!outcome.complete) continue;

        const reachedFirstTargets = UPSIDE_TARGETS.filter(target =>
          outcome[`up${target}Outcome`] === "TARGET_FIRST"
        );

        if (reachedFirstTargets.length > 0) {
          qualifying.push({
            ...record,
            reachedTargetsBeforeDown5: reachedFirstTargets
              .map(target => `+${target}%`)
              .join(";")
          });
        }
      }
    }
  }

  const summary = [];

  for (const variant of VARIANTS) {
    for (const windowMinutes of WINDOWS) {
      const rows = detailed.filter(row =>
        row.variant === variant &&
        row.windowMinutes === windowMinutes
      );

      const complete = rows.filter(row => row.complete);

      const up5First = countOutcome(
        complete, "up5Outcome", "TARGET_FIRST"
      );

      const down5First = countOutcome(
        complete, "up5Outcome", "DOWN_FIRST"
      );

      const ambiguous5 = countOutcome(
        complete, "up5Outcome", "AMBIGUOUS_SAME_CANDLE"
      );

      const neither5 = countOutcome(
        complete, "up5Outcome", "NEITHER"
      );

      const summaryRow = {
        variant,
        windowMinutes,
        signals: rows.length,
        completeSignals: complete.length,
        incompleteSignals: rows.length - complete.length,

        up5First,
        down5First,
        ambiguous5,
        neither5,

        up5FirstPct: complete.length
          ? Number((up5First / complete.length * 100).toFixed(2))
          : null,

        up5AmbiguousPct: complete.length
          ? Number((ambiguous5 / complete.length * 100).toFixed(2))
          : null,

        up10BeforeDown5: countOutcome(
          complete, "up10Outcome", "TARGET_FIRST"
        ),

        up10Down5First: countOutcome(
          complete, "up10Outcome", "DOWN_FIRST"
        ),

        up10Ambiguous: countOutcome(
          complete, "up10Outcome", "AMBIGUOUS_SAME_CANDLE"
        ),

        up20BeforeDown5: countOutcome(
          complete, "up20Outcome", "TARGET_FIRST"
        ),

        up20Down5First: countOutcome(
          complete, "up20Outcome", "DOWN_FIRST"
        ),

        up20Ambiguous: countOutcome(
          complete, "up20Outcome", "AMBIGUOUS_SAME_CANDLE"
        ),

        up30BeforeDown5: countOutcome(
          complete, "up30Outcome", "TARGET_FIRST"
        ),

        up30Down5First: countOutcome(
          complete, "up30Outcome", "DOWN_FIRST"
        ),

        up30Ambiguous: countOutcome(
          complete, "up30Outcome", "AMBIGUOUS_SAME_CANDLE"
        ),

        avgMaxUpsidePct: mean(complete, "maxUpsidePct"),
        avgMaxDrawdownPct: mean(complete, "maxDrawdownPct"),
        avgRetracementFromPeakPct: mean(
          complete, "retracementFromPeakPct"
        )
      };

      summary.push(summaryRow);
    }
  }

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const detailFile = path.join(
    DATA_DIR, `multi-window-detail-${timestamp}.csv`
  );

  const summaryFile = path.join(
    DATA_DIR, `multi-window-summary-${timestamp}.csv`
  );

  const qualifyingFile = path.join(
    DATA_DIR, `multi-window-qualifying-${timestamp}.csv`
  );

  writeCsv(detailFile, detailed);
  writeCsv(summaryFile, summary);
  writeCsv(qualifyingFile, qualifying);

  console.log("\n=== CORRECTED SUMMARY: TARGET BEFORE -5% ===");

  console.table(summary.map(row => ({
    variant: row.variant,
    minutes: row.windowMinutes,
    signals: row.signals,
    complete: row.completeSignals,
    incomplete: row.incompleteSignals,
    up5First: row.up5First,
    down5First: row.down5First,
    ambiguous5: row.ambiguous5,
    neither5: row.neither5,
    up5FirstPct: row.up5FirstPct,
    up10First: row.up10BeforeDown5,
    up20First: row.up20BeforeDown5,
    up30First: row.up30BeforeDown5,
    avgUpsidePct: row.avgMaxUpsidePct,
    avgDrawdownPct: row.avgMaxDrawdownPct
  })));

  console.log("\n[Output] Detailed report:", detailFile);
  console.log("[Output] Summary report:", summaryFile);
  console.log("[Output] Qualifying signals:", qualifyingFile);

  console.log("\n=== DATA QUALITY COUNTS ===");
  console.log("Missing dataset rows:", missingDatasetRows);
  console.log("Invalid candle-index rows:", invalidIndexRows);
  console.log("Duplicate signal rows skipped:", duplicateSignalRows);
  console.log("Invalid entry-price rows skipped:", invalidEntryRows);

  console.log(
    "\nImportant: same-candle threshold crossings are ambiguous with OHLCV data. " +
    "These results are historical research only and do not model execution, " +
    "fees, slippage, or achievable trade returns."
  );
}

try {
  main();
} catch (error) {
  console.error("[Multi-window analysis failed]", error);
  process.exitCode = 1;
}
