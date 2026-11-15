
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data/chart-replay");
const MINUTE_MS = 60_000;
const MAX_OVERLAP_WINDOW_MINUTES = 60;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function newestCsv(prefix) {
  const files = fs.readdirSync(DATA_DIR)
    .filter(name => name.startsWith(prefix) && name.endsWith(".csv"))
    .sort()
    .reverse();

  if (!files.length) {
    throw new Error(`No ${prefix}*.csv file found`);
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
    const cells = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });

    return row;
  });
}

function loadDatasets() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(name =>
      name.endsWith(".json") &&
      !name.startsWith("signal-") &&
      !name.startsWith("multi-window-")
    );

  return files.map(name => {
    const fullPath = path.join(DATA_DIR, name);
    const parsed = readJson(fullPath);

    if (!Array.isArray(parsed.candles)) {
      throw new Error(`Missing candles array in ${name}`);
    }

    const candles = parsed.candles.map(candle => ({
      time: Number(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume)
    }));

    return {
      name,
      tokenMint: parsed.tokenMint || name.split("_")[0],
      timeframe: parsed.timeframe || "unknown",
      candles
    };
  });
}

function candleKey(candle) {
  return [
    candle.time,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume
  ].join("|");
}

function compareDatasets(a, b) {
  const mapB = new Map(b.candles.map(candle => [
    candle.time,
    candleKey(candle)
  ]));

  let sharedTimestamps = 0;
  let identicalCandles = 0;

  for (const candle of a.candles) {
    if (!mapB.has(candle.time)) continue;

    sharedTimestamps++;

    if (mapB.get(candle.time) === candleKey(candle)) {
      identicalCandles++;
    }
  }

  const denominator = Math.max(
    1,
    Math.min(a.candles.length, b.candles.length)
  );

  return {
    tokenMint: a.tokenMint,
    datasetA: a.name,
    datasetB: b.name,
    candlesA: a.candles.length,
    candlesB: b.candles.length,
    sharedTimestamps,
    identicalCandles,
    identicalPctOfSmallerDataset: Number(
      (identicalCandles / denominator * 100).toFixed(2)
    ),
    overlapPctOfSmallerDataset: Number(
      (sharedTimestamps / denominator * 100).toFixed(2)
    )
  };
}

function auditTimestampCoverage(dataset) {
  const times = dataset.candles.map(candle => candle.time);
  const uniqueTimes = new Set(times);
  let oneMinuteGaps = 0;
  let largeGaps = 0;

  const sorted = [...uniqueTimes].sort((a, b) => a - b);

  for (let i = 1; i < sorted.length; i++) {
    const difference = sorted[i] - sorted[i - 1];

    if (difference > MINUTE_MS) {
      if (difference === 2 * MINUTE_MS) {
        oneMinuteGaps++;
      } else {
        largeGaps++;
      }
    }
  }

  return {
    dataset: dataset.name,
    tokenMint: dataset.tokenMint,
    candles: dataset.candles.length,
    uniqueTimestamps: uniqueTimes.size,
    duplicateTimestamps: times.length - uniqueTimes.size,
    firstTime: sorted[0] ?? null,
    lastTime: sorted[sorted.length - 1] ?? null,
    oneMinuteGaps,
    largeGaps
  };
}

function main() {
  const datasets = loadDatasets();
  const signalPath = newestCsv("signal-detail-");
  const signals = readCsv(signalPath);

  console.log("[Input] Datasets:", datasets.length);
  console.log("[Input] Signal report:", path.basename(signalPath));
  console.log("[Input] Signal report rows:", signals.length);

  console.log("\n=== DATASET COVERAGE ===");
  console.table(datasets.map(auditTimestampCoverage));

  console.log("\n=== SAME-TOKEN DATASET COMPARISONS ===");

  const comparisons = [];

  for (let i = 0; i < datasets.length; i++) {
    for (let j = i + 1; j < datasets.length; j++) {
      if (datasets[i].tokenMint !== datasets[j].tokenMint) continue;

      comparisons.push(compareDatasets(datasets[i], datasets[j]));
    }
  }

  console.table(comparisons);

  const datasetNames = new Set(datasets.map(dataset => dataset.name));
  const unknownDatasetRows = signals.filter(
    row => !datasetNames.has(row.dataset)
  );

  const signalKeys = new Set();
  const uniqueSignalRows = [];
  let duplicateSignalRows = 0;
  let invalidSignalRows = 0;

  for (const row of signals) {
    const index = Number(row.candleIndex);

    if (!Number.isInteger(index) || index < 0) {
      invalidSignalRows++;
      continue;
    }

    const key = [
      row.dataset,
      row.tokenMint,
      index
    ].join("|");

    if (signalKeys.has(key)) {
      duplicateSignalRows++;
      continue;
    }

    signalKeys.add(key);
    uniqueSignalRows.push(row);
  }

  const baselineSignals = uniqueSignalRows.filter(
    row => String(row.A_signal).toLowerCase() === "true"
  );

  const perVariant = ["A", "B", "C", "D"].map(variant => {
    const selected = uniqueSignalRows.filter(
      row => String(row[`${variant}_signal`]).toLowerCase() === "true"
    );

    return {
      variant,
      signals: selected.length,
      uniqueTokens: new Set(selected.map(row => row.tokenMint)).size,
      datasets: new Set(selected.map(row => row.dataset)).size
    };
  });

  console.log("\n=== SIGNAL COUNTS ===");
  console.table(perVariant);

  console.log("\n=== SIGNAL REPORT QUALITY ===");
  console.table([{
    totalReportRows: signals.length,
    uniqueDatasetCandleRows: uniqueSignalRows.length,
    repeatedDatasetCandleRows: duplicateSignalRows,
    invalidCandleIndexRows: invalidSignalRows,
    rowsWithMissingDataset: unknownDatasetRows.length,
    baselineASignals: baselineSignals.length,
    uniqueTokens: new Set(uniqueSignalRows.map(row => row.tokenMint)).size
  }]);

  // Identify overlapping baseline signal windows. These are flagged,
  // not automatically deleted, because separate signals may be meaningful.
  const overlapRows = [];

  const byDataset = new Map();

  for (const row of baselineSignals) {
    const dataset = datasets.find(item => item.name === row.dataset);
    const index = Number(row.candleIndex);

    if (!dataset || !dataset.candles[index]) continue;

    const entryTime = dataset.candles[index].time;

    if (!byDataset.has(row.dataset)) byDataset.set(row.dataset, []);

    byDataset.get(row.dataset).push({
      dataset: row.dataset,
      tokenMint: row.tokenMint,
      candleIndex: index,
      entryTime,
      endTime: entryTime + MAX_OVERLAP_WINDOW_MINUTES * MINUTE_MS
    });
  }

  for (const [dataset, entries] of byDataset) {
    entries.sort((a, b) => a.entryTime - b.entryTime);

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[j].entryTime > entries[i].endTime) break;

        overlapRows.push({
          dataset,
          tokenMint: entries[i].tokenMint,
          earlierCandleIndex: entries[i].candleIndex,
          laterCandleIndex: entries[j].candleIndex,
          minutesBetweenSignals: Number(
            ((entries[j].entryTime - entries[i].entryTime) / MINUTE_MS)
              .toFixed(2)
          ),
          overlapMinutes: Number(
            Math.max(
              0,
              (entries[i].endTime - entries[j].entryTime) / MINUTE_MS
            ).toFixed(2)
          )
        });
      }
    }
  }

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const datasetAuditPath = path.join(
    DATA_DIR,
    `research-dataset-audit-${timestamp}.csv`
  );

  const overlapPath = path.join(
    DATA_DIR,
    `research-overlapping-signals-${timestamp}.csv`
  );

  const comparisonPath = path.join(
    DATA_DIR,
    `research-dataset-comparisons-${timestamp}.csv`
  );

  const variantRows = perVariant.map(row => ({ ...row }));

  fs.writeFileSync(
    datasetAuditPath,
    [
      "dataset,tokenMint,candles,uniqueTimestamps,duplicateTimestamps,firstTime,lastTime,oneMinuteGaps,largeGaps",
      ...datasets.map(dataset => {
        const row = auditTimestampCoverage(dataset);
        return [
          row.dataset,
          row.tokenMint,
          row.candles,
          row.uniqueTimestamps,
          row.duplicateTimestamps,
          row.firstTime,
          row.lastTime,
          row.oneMinuteGaps,
          row.largeGaps
        ].map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
      })
    ].join("\n") + "\n",
    "utf8"
  );

  function writeRows(filePath, rows) {
    if (!rows.length) {
      fs.writeFileSync(filePath, "", "utf8");
      return;
    }

    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];

    const escape = value => {
      const text = String(value ?? "");
      return /[",\r\n]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    };

    fs.writeFileSync(
      filePath,
      [
        headers.map(escape).join(","),
        ...rows.map(row => headers.map(key => escape(row[key])).join(","))
      ].join("\n") + "\n",
      "utf8"
    );
  }

  writeRows(overlapPath, overlapRows);
  writeRows(comparisonPath, comparisons);

  console.log("\n=== OVERLAPPING BASELINE SIGNAL WINDOWS ===");
  console.log("Overlapping signal pairs:", overlapRows.length);

  console.log("\n[Output] Dataset audit:", datasetAuditPath);
  console.log("[Output] Overlap report:", overlapPath);
  console.log("[Output] Dataset comparisons:", comparisonPath);

  console.log(
    "\nAudit only: no source datasets, reports, or live trading files were changed."
  );
}

try {
  main();
} catch (error) {
  console.error("[Research audit failed]", error);
  process.exitCode = 1;
}
