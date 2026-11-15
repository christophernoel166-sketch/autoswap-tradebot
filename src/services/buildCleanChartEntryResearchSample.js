
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data/chart-replay");

const VARIANTS = ["A", "B", "C", "D"];
const MINUTE_MS = 60_000;
const EPISODE_MINUTES = 60;
const TARGETS = [5, 10, 20, 30];
const DOWNSIDE_PCT = -5;

function newestFile(prefix) {
  const files = fs.readdirSync(DATA_DIR)
    .filter(name => name.startsWith(prefix) && name.endsWith(".csv"))
    .sort()
    .reverse();

  if (!files.length) {
    throw new Error(`No ${prefix}*.csv report found`);
  }

  return path.join(DATA_DIR, files[0]);
}

function parseCsvLine(line) {
  const result = [];
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
      result.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  result.push(value);
  return result;
}

function readCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
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
    const text = String(value);

    return /[",\r\n]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };

  const output = [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(key => escape(row[key])).join(","))
  ];

  fs.writeFileSync(filePath, output.join("\n") + "\n", "utf8");
}

function loadDatasets() {
  const names = fs.readdirSync(DATA_DIR)
    .filter(name =>
      name.endsWith(".json") &&
      !name.startsWith("signal-") &&
      !name.startsWith("multi-window-") &&
      !name.startsWith("research-")
    );

  return names.map(name => {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, name), "utf8")
    );

    if (!Array.isArray(parsed.candles)) {
      throw new Error(`No candles array in ${name}`);
    }

    const candles = parsed.candles.map(c => ({
      time: Number(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume)
    }));

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const valid = candles.every(c =>
      Number.isFinite(c.time) &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close) &&
      c.open > 0 &&
      c.high > 0 &&
      c.low > 0 &&
      c.close > 0 &&
      c.high >= c.low
    );

    const uniqueTimes = new Set(candles.map(c => c.time));

    if (!valid || uniqueTimes.size !== candles.length) {
      throw new Error(`Invalid candles or duplicate timestamps in ${name}`);
    }

    return {
      name,
      tokenMint: parsed.tokenMint || name.split("_")[0],
      timeframe: parsed.timeframe || "1m",
      candles: sorted,
      firstTime: sorted[0]?.time ?? null,
      lastTime: sorted.at(-1)?.time ?? null,
      candleCount: sorted.length
    };
  });
}

function compareOverlap(a, b) {
  const bByTime = new Map(b.candles.map(c => [c.time, c]));
  let shared = 0;
  let identical = 0;

  for (const c of a.candles) {
    const other = bByTime.get(c.time);
    if (!other) continue;

    shared++;

    if (
      c.open === other.open &&
      c.high === other.high &&
      c.low === other.low &&
      c.close === other.close &&
      c.volume === other.volume
    ) {
      identical++;
    }
  }

  const smaller = Math.max(1, Math.min(a.candleCount, b.candleCount));

  return {
    tokenMint: a.tokenMint,
    datasetA: a.name,
    datasetB: b.name,
    candlesA: a.candleCount,
    candlesB: b.candleCount,
    sharedTimestamps: shared,
    identicalCandles: identical,
    identicalPctOfSmaller: Number((identical / smaller * 100).toFixed(2))
  };
}

function chooseCanonicalDatasets(datasets) {
  const byToken = new Map();

  for (const dataset of datasets) {
    if (!byToken.has(dataset.tokenMint)) {
      byToken.set(dataset.tokenMint, []);
    }
    byToken.get(dataset.tokenMint).push(dataset);
  }

  const canonical = new Map();
  const decisions = [];

  for (const [tokenMint, list] of byToken) {
    // Prefer the dataset with the most candles. In a tie, prefer
    // the one spanning the largest timestamp range.
    list.sort((a, b) =>
      b.candleCount - a.candleCount ||
      (b.lastTime - b.firstTime) - (a.lastTime - a.firstTime)
    );

    canonical.set(tokenMint, list[0]);

    for (const dataset of list) {
      decisions.push({
        tokenMint,
        dataset: dataset.name,
        candleCount: dataset.candleCount,
        firstTime: dataset.firstTime,
        lastTime: dataset.lastTime,
        selectedCanonical: dataset.name === list[0].name,
        reason: dataset.name === list[0].name
          ? "Largest candle count; tie-break by time span"
          : "Alternative same-token dataset; retained for audit"
      });
    }
  }

  return { canonical, decisions };
}

function evaluateOutcome(candles, signalIndex, entryPrice) {
  const signalCandle = candles[signalIndex];

  const result = {
    complete60m: false,
    observedCandles60m: 0,
    maxUpsidePct60m: null,
    maxDrawdownPct60m: null,
    minutesToPeak: null,
    retracementFromPeakPct: null,
    target5Outcome: "INCOMPLETE",
    target10Outcome: "INCOMPLETE",
    target20Outcome: "INCOMPLETE",
    target30Outcome: "INCOMPLETE",
    thresholdOrder5: "INCOMPLETE"
  };

  if (!signalCandle || !(entryPrice > 0) || !Number.isFinite(entryPrice)) {
    result.thresholdOrder5 = "INVALID_ENTRY";
    return result;
  }

  const endTime = signalCandle.time + EPISODE_MINUTES * MINUTE_MS;
  const future = [];

  for (let i = signalIndex + 1; i < candles.length; i++) {
    if (candles[i].time > endTime) break;
    future.push(candles[i]);
  }

  result.observedCandles60m = future.length;

  const complete = future.length >= EPISODE_MINUTES &&
    future.slice(0, EPISODE_MINUTES).every((c, i) =>
      c.time === signalCandle.time + (i + 1) * MINUTE_MS
    );

  result.complete60m = complete;

  if (!future.length) return result;

  const observed = future.slice(0, EPISODE_MINUTES);
  const peak = observed.reduce(
    (best, candle) => candle.high > best.high ? candle : best,
    observed[0]
  );
  const lowest = Math.min(...observed.map(c => c.low));

  result.maxUpsidePct60m = Number(
    ((peak.high - entryPrice) / entryPrice * 100).toFixed(4)
  );

  result.maxDrawdownPct60m = Number(
    ((lowest - entryPrice) / entryPrice * 100).toFixed(4)
  );

  result.minutesToPeak = (peak.time - signalCandle.time) / MINUTE_MS;

  const last = observed.at(-1);
  result.retracementFromPeakPct = Number(
    ((peak.high - last.close) / peak.high * 100).toFixed(4)
  );

  if (!complete) return result;

  const targetIndexes = {};

  for (const target of TARGETS) {
    targetIndexes[target] = null;
  }

  let downIndex = null;

  for (let i = 0; i < observed.length; i++) {
    const candle = observed[i];

    for (const target of TARGETS) {
      if (
        targetIndexes[target] === null &&
        candle.high >= entryPrice * (1 + target / 100)
      ) {
        targetIndexes[target] = i;
      }
    }

    if (
      downIndex === null &&
      candle.low <= entryPrice * (1 + DOWNSIDE_PCT / 100)
    ) {
      downIndex = i;
    }
  }

  for (const target of TARGETS) {
    const targetIndex = targetIndexes[target];
    const key = `target${target}Outcome`;

    if (targetIndex === null && downIndex === null) {
      result[key] = "NEITHER";
    } else if (targetIndex === null) {
      result[key] = "DOWN_FIRST";
    } else if (downIndex === null) {
      result[key] = "TARGET_FIRST";
    } else if (targetIndex < downIndex) {
      result[key] = "TARGET_FIRST";
    } else if (downIndex < targetIndex) {
      result[key] = "DOWN_FIRST";
    } else {
      result[key] = "AMBIGUOUS_SAME_CANDLE";
    }
  }

  result.target5Outcome = result.target5Outcome ?? "INCOMPLETE";
  result.target10Outcome = result.target10Outcome ?? "INCOMPLETE";
  result.target20Outcome = result.target20Outcome ?? "INCOMPLETE";
  result.target30Outcome = result.target30Outcome ?? "INCOMPLETE";

  result.thresholdOrder5 = result.target5Outcome === "TARGET_FIRST"
    ? "UP_FIRST"
    : result.target5Outcome === "DOWN_FIRST"
      ? "DOWN_FIRST"
      : result.target5Outcome;

  return result;
}

function extractEntryFeatures(candles, index) {
  const current = candles[index];
  const previous = candles[index - 1];
  const prior5 = candles.slice(Math.max(0, index - 5), index);
  const prior10 = candles.slice(Math.max(0, index - 10), index);
  const prior20 = candles.slice(Math.max(0, index - 20), index);

  if (!current || !previous || prior20.length < 20) {
    return {
      entryFeaturesComplete: false,
      reason: "Insufficient preceding candle history"
    };
  }

  const average = values =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;

  const range = current.high - current.low;
  const closePosition = range > 0
    ? (current.close - current.low) / range
    : null;

  const meanVolume5 = average(prior5.map(c => c.volume));
  const meanVolume10 = average(prior10.map(c => c.volume));
  const meanVolume20 = average(prior20.map(c => c.volume));

  const sumVolume = candlesToSum =>
    candlesToSum.reduce((sum, candle) => sum + candle.volume, 0);

  const prior5High = Math.max(...prior5.map(c => c.high));
  const prior10High = Math.max(...prior10.map(c => c.high));
  const prior20High = Math.max(...prior20.map(c => c.high));

  const prior5Low = Math.min(...prior5.map(c => c.low));
  const prior10Low = Math.min(...prior10.map(c => c.low));
  const prior20Low = Math.min(...prior20.map(c => c.low));

  return {
    entryFeaturesComplete: true,

    candleOpen: current.open,
    candleHigh: current.high,
    candleLow: current.low,
    candleClose: current.close,
    candleVolume: current.volume,

    candleBodyPct: Number(
      ((current.close - current.open) / current.open * 100).toFixed(4)
    ),

    candleRangePct: Number(
      ((current.high - current.low) / current.open * 100).toFixed(4)
    ),

    closePosition: closePosition === null
      ? null
      : Number(closePosition.toFixed(4)),

    upperWickPct: Number(
      ((current.high - Math.max(current.open, current.close)) /
        current.open * 100).toFixed(4)
    ),

    lowerWickPct: Number(
      ((Math.min(current.open, current.close) - current.low) /
        current.open * 100).toFixed(4)
    ),

    previousCloseChangePct: Number(
      ((current.close - previous.close) / previous.close * 100).toFixed(4)
    ),

    momentum5mPct: Number(
      ((current.close - prior5[0].open) / prior5[0].open * 100).toFixed(4)
    ),

    momentum10mPct: Number(
      ((current.close - prior10[0].open) / prior10[0].open * 100).toFixed(4)
    ),

    momentum20mPct: Number(
      ((current.close - prior20[0].open) / prior20[0].open * 100).toFixed(4)
    ),

    volumeVsPrior5Avg: meanVolume5 > 0
      ? Number((current.volume / meanVolume5).toFixed(4))
      : null,

    volumeVsPrior10Avg: meanVolume10 > 0
      ? Number((current.volume / meanVolume10).toFixed(4))
      : null,

    volumeVsPrior20Avg: meanVolume20 > 0
      ? Number((current.volume / meanVolume20).toFixed(4))
      : null,

    volumeSum5: sumVolume(prior5),
    volumeSum10: sumVolume(prior10),
    volumeSum20: sumVolume(prior20),

    distanceFromPrior5HighPct: Number(
      ((current.close - prior5High) / prior5High * 100).toFixed(4)
    ),

    distanceFromPrior10HighPct: Number(
      ((current.close - prior10High) / prior10High * 100).toFixed(4)
    ),

    distanceFromPrior20HighPct: Number(
      ((current.close - prior20High) / prior20High * 100).toFixed(4)
    ),

    distanceFromPrior5LowPct: Number(
      ((current.close - prior5Low) / prior5Low * 100).toFixed(4)
    ),

    distanceFromPrior10LowPct: Number(
      ((current.close - prior10Low) / prior10Low * 100).toFixed(4)
    ),

    distanceFromPrior20LowPct: Number(
      ((current.close - prior20Low) / prior20Low * 100).toFixed(4)
    )
  };
}

function main() {
  const datasets = loadDatasets();
  const signalRows = readCsv(newestFile("signal-detail-"));

  const { canonical, decisions } = chooseCanonicalDatasets(datasets);

  console.log("[Input] Datasets:", datasets.length);
  console.log("[Input] Canonical token datasets:", canonical.size);
  console.log("[Input] Signal report rows:", signalRows.length);

  const selectedDatasetNames = new Set(
    [...canonical.values()].map(dataset => dataset.name)
  );

  const rawSignals = [];

  for (const row of signalRows) {
    if (!selectedDatasetNames.has(row.dataset)) continue;

    const dataset = canonical.get(row.tokenMint);
    if (!dataset || dataset.name !== row.dataset) continue;

    const index = Number(row.candleIndex);
    if (!Number.isInteger(index) || index < 20 || index >= dataset.candles.length) {
      continue;
    }

    for (const variant of VARIANTS) {
      if (String(row[`${variant}_signal`]).toLowerCase() !== "true") {
        continue;
      }

      const entryPrice = Number(row[`${variant}_entryPrice`]);
      if (!(entryPrice > 0) || !Number.isFinite(entryPrice)) continue;

      rawSignals.push({
        dataset: dataset.name,
        tokenMint: row.tokenMint,
        timeframe: row.timeframe,
        candleIndex: index,
        signalTime: dataset.candles[index].time,
        variant,
        action: row[`${variant}_action`],
        setupType: row[`${variant}_setupType`],
        score: row[`${variant}_score`],
        entryPrice
      });
    }
  }

  // Keep each variant's signal history separate. A/B/C/D are different
  // hypotheses and should not suppress one another during deduplication.
  rawSignals.sort((a, b) =>
    a.tokenMint.localeCompare(b.tokenMint) ||
    a.variant.localeCompare(b.variant) ||
    a.signalTime - b.signalTime
  );

  const selected = [];
  const skippedOverlaps = [];

  const lastSelectedEndByTokenVariant = new Map();

  for (const signal of rawSignals) {
    const key = `${signal.tokenMint}|${signal.variant}`;
    const previousEnd = lastSelectedEndByTokenVariant.get(key);

    if (previousEnd !== undefined && signal.signalTime <= previousEnd) {
      skippedOverlaps.push({
        ...signal,
        reason: "Overlaps prior selected 60-minute episode"
      });
      continue;
    }

    selected.push(signal);

    lastSelectedEndByTokenVariant.set(
      key,
      signal.signalTime + EPISODE_MINUTES * MINUTE_MS
    );
  }

  const cleanRows = [];
  const incompleteRows = [];

  for (const signal of selected) {
    const dataset = canonical.get(signal.tokenMint);
    const features = extractEntryFeatures(dataset.candles, signal.candleIndex);
    const outcome = evaluateOutcome(
      dataset.candles,
      signal.candleIndex,
      signal.entryPrice
    );

    const record = {
      ...signal,
      ...features,
      ...outcome
    };

    if (!record.complete60m) {
      incompleteRows.push({
        ...record,
        exclusionReason: "Incomplete or discontinuous 60-minute window"
      });
      continue;
    }

    cleanRows.push(record);
  }

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const canonicalPath = path.join(
    DATA_DIR,
    `clean-sample-canonical-datasets-${timestamp}.csv`
  );

  const overlapPath = path.join(
    DATA_DIR,
    `clean-sample-skipped-overlaps-${timestamp}.csv`
  );

  const incompletePath = path.join(
    DATA_DIR,
    `clean-sample-incomplete-${timestamp}.csv`
  );

  const cleanPath = path.join(
    DATA_DIR,
    `clean-sample-features-outcomes-${timestamp}.csv`
  );

  writeCsv(canonicalPath, decisions);
  writeCsv(overlapPath, skippedOverlaps);
  writeCsv(incompletePath, incompleteRows);
  writeCsv(cleanPath, cleanRows);

  const summary = [];

  for (const variant of VARIANTS) {
    const rows = cleanRows.filter(row => row.variant === variant);

    summary.push({
      variant,
      selectedSignals: selected.filter(row => row.variant === variant).length,
      overlappingSignalsSkipped: skippedOverlaps.filter(
        row => row.variant === variant
      ).length,
      incompleteWindowsExcluded: incompleteRows.filter(
        row => row.variant === variant
      ).length,
      cleanEpisodes: rows.length,
      uniqueTokens: new Set(rows.map(row => row.tokenMint)).size,
      target5First: rows.filter(row =>
        row.target5Outcome === "TARGET_FIRST"
      ).length,
      target10First: rows.filter(row =>
        row.target10Outcome === "TARGET_FIRST"
      ).length,
      target20First: rows.filter(row =>
        row.target20Outcome === "TARGET_FIRST"
      ).length,
      target30First: rows.filter(row =>
        row.target30Outcome === "TARGET_FIRST"
      ).length
    });
  }

  console.log("\n=== CLEAN EPISODE SUMMARY ===");
  console.table(summary);

  console.log("\n[Output] Canonical datasets:", canonicalPath);
  console.log("[Output] Skipped overlapping signals:", overlapPath);
  console.log("[Output] Incomplete windows:", incompletePath);
  console.log("[Output] Clean feature/outcome sample:", cleanPath);

  console.log(
    "\nOffline research only. The canonical dataset choice is a convenience " +
    "for deduplication, not proof that one capture is inherently more accurate."
  );
}

try {
  main();
} catch (error) {
  console.error("[Clean sample build failed]", error);
  process.exitCode = 1;
}


