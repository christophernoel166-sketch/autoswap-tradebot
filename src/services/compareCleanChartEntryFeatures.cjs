const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve("data/chart-replay");

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.trim().split(/\r?\n/);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const values = line.split(",");
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

  const headers = Object.keys(rows[0]);

  const escape = value => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text)
      ? '"' + text.replace(/"/g, '""') + '"'
      : text;
  };

  const output = [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(","))
  ].join("\n");

  fs.writeFileSync(filePath, output + "\n", "utf8");
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

const files = fs.readdirSync(DATA_DIR)
  .filter(name => /^clean-sample-features-outcomes-.*\.csv$/.test(name))
  .map(name => ({
    name,
    path: path.join(DATA_DIR, name),
    mtime: fs.statSync(path.join(DATA_DIR, name)).mtimeMs
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (!files.length) {
  throw new Error("No clean-sample feature/outcome CSV found.");
}

const inputFile = files[0];
const data = readCsv(inputFile.path);

const features = [
  "candleBodyPct",
  "candleRangePct",
  "closePosition",
  "upperWickPct",
  "lowerWickPct",
  "previousCloseChangePct",
  "momentum5mPct",
  "momentum10mPct",
  "momentum20mPct",
  "volumeVsPrior5Avg",
  "volumeVsPrior10Avg",
  "volumeVsPrior20Avg",
  "distanceFromPrior5HighPct",
  "distanceFromPrior10HighPct",
  "distanceFromPrior20HighPct",
  "distanceFromPrior5LowPct",
  "distanceFromPrior10LowPct",
  "distanceFromPrior20LowPct",
  "maxUpsidePct60m",
  "maxDrawdownPct60m"
];

const groups = ["TARGET_FIRST", "DOWN_FIRST"];
const summary = [];

for (const feature of features) {
  for (const outcome of groups) {
    const values = data
      .filter(row => row.target5Outcome === outcome)
      .map(row => Number(row[feature]))
      .filter(Number.isFinite);

    if (!values.length) continue;

    summary.push({
      feature,
      outcome,
      count: values.length,
      median: Number(median(values).toFixed(4)),
      minimum: Number(Math.min(...values).toFixed(4)),
      maximum: Number(Math.max(...values).toFixed(4))
    });
  }
}

const timestamp = new Date().toISOString().replace(/:/g, "-");
const outputFile = path.join(
  DATA_DIR,
  `clean-sample-feature-comparison-${timestamp}.csv`
);

writeCsv(outputFile, summary);

console.log("[Input]", inputFile.path);
console.log("[Rows]", data.length);
console.log("\n=== FEATURE COMPARISON ===");
console.table(summary);
console.log("\n[Output]", outputFile);
console.log(
  "\nExploratory only: features describe selected episodes; " +
  "differences do not establish causation or predictive performance."
);
