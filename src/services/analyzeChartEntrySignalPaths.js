
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data/chart-replay");
const MIN_HISTORY = 100;
const FORWARD_CANDLES = 15;
const THRESHOLD_PCT = 5;

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
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

function classifyPath(candles, index, entryPrice) {
  const future = candles.slice(
    index + 1,
    index + 1 + FORWARD_CANDLES
  );

  if (
    future.length !== FORWARD_CANDLES ||
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0
  ) {
    return { path: "UNAVAILABLE", maxUpsidePct: null, maxDrawdownPct: null };
  }

  const upper = entryPrice * (1 + THRESHOLD_PCT / 100);
  const lower = entryPrice * (1 - THRESHOLD_PCT / 100);

  let upIndex = -1;
  let downIndex = -1;

  for (let i = 0; i < future.length; i++) {
    const high = Number(future[i].high);
    const low = Number(future[i].low);

    const hitUp = high >= upper;
    const hitDown = low <= lower;

    if (hitUp && hitDown) {
      // OHLC candles do not tell us which threshold was hit first.
      if (upIndex === -1) upIndex = i;
      if (downIndex === -1) downIndex = i;
      break;
    }

    if (hitUp && upIndex === -1) upIndex = i;
    if (hitDown && downIndex === -1) downIndex = i;

    if (upIndex !== -1 && downIndex !== -1) break;
  }

  const futureHigh = Math.max(...future.map((c) => Number(c.high)));
  const futureLow = Math.min(...future.map((c) => Number(c.low)));

  const maxUpsidePct = ((futureHigh - entryPrice) / entryPrice) * 100;
  const maxDrawdownPct = ((futureLow - entryPrice) / entryPrice) * 100;

  let path = "NEITHER";

  if (upIndex !== -1 && downIndex !== -1) {
    if (upIndex === downIndex) {
      path = "BOTH_SAME_CANDLE";
    } else if (upIndex < downIndex) {
      path = "UP_FIRST";
    } else {
      path = "DOWN_FIRST";
    }
  } else if (upIndex !== -1) {
    path = "UP_FIRST";
  } else if (downIndex !== -1) {
    path = "DOWN_FIRST";
  }

  return {
    path,
    firstUpCandleOffset: upIndex === -1 ? null : upIndex + 1,
    firstDownCandleOffset: downIndex === -1 ? null : downIndex + 1,
    maxUpsidePct: round(maxUpsidePct),
    maxDrawdownPct: round(maxDrawdownPct),
  };
}

async function main() {
  const files = (await readdir(DATA_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort();

  const largestByToken = new Map();

  for (const file of files) {
    const content = await readFile(path.join(DATA_DIR, file));
    const dataset = JSON.parse(content.toString("utf8"));
    const mint = dataset.tokenMint ?? file.match(/^(.+?)_1m_/)?.[1];

    if (!mint) continue;

    const previous = largestByToken.get(mint);
    if (!previous || content.length > previous.size) {
      largestByToken.set(mint, { file, size: content.length });
    }
  }

  const selectedFiles = [...largestByToken.values()]
    .map((item) => item.file)
    .sort();

  const allRows = [];

  for (const file of selectedFiles) {
    const dataset = JSON.parse(
      await readFile(path.join(DATA_DIR, file), "utf8")
    );
    const candles = dataset.candles;

    if (!Array.isArray(candles) || candles.length <= MIN_HISTORY + FORWARD_CANDLES) {
      console.warn(`Skipping insufficient dataset: ${file}`);
      continue;
    }

    const detailPath = path.join(DATA_DIR, "signal-detail-" + "");
    const reportFiles = (await readdir(DATA_DIR))
      .filter((name) => /^signal-detail-.*\.csv$/.test(name))
      .sort()
      .reverse();

    if (!reportFiles.length) {
      throw new Error("No signal-detail CSV found. Run reportChartEntryRecoverySignals.js first.");
    }

    const reportText = await readFile(path.join(DATA_DIR, reportFiles[0]), "utf8");
    const reportRows = parseCsv(reportText);
    const rowsForDataset = reportRows.filter((row) => row.dataset === file);

    const indexed = new Map(
      rowsForDataset.map((row) => [Number(row.candleIndex), row])
    );

    for (let index = MIN_HISTORY; index < candles.length - FORWARD_CANDLES; index++) {
      const source = indexed.get(index);
      if (!source || source.A_signal !== "true") continue;

      const entryPrice = Number(source.A_entryPrice || candles[index].close);
      const pathResult = classifyPath(candles, index, entryPrice);

      allRows.push({
        dataset: file,
        tokenMint: dataset.tokenMint ?? "",
        candleIndex: index,
        time: candles[index].time ?? "",
        entryPrice,
        path: pathResult.path,
        firstUpCandleOffset: pathResult.firstUpCandleOffset ?? "",
        firstDownCandleOffset: pathResult.firstDownCandleOffset ?? "",
        maxUpsidePct: pathResult.maxUpsidePct,
        maxDrawdownPct: pathResult.maxDrawdownPct,
        B_decision: source.B_signal === "true" ? "RETAINED" : "REJECTED",
        C_decision: source.C_signal === "true" ? "RETAINED" : "REJECTED",
        D_decision: source.D_signal === "true" ? "RETAINED" : "REJECTED",
      });
    }
  }

  if (!allRows.length) {
    throw new Error("No baseline A entry signals found in the detailed report.");
  }

  const summaries = [];

  for (const tokenMint of [...new Set(allRows.map((r) => r.tokenMint))]) {
    for (const variant of ["B", "C", "D"]) {
      for (const decision of ["RETAINED", "REJECTED"]) {
        const subset = allRows.filter(
          (r) => r.tokenMint === tokenMint && r[`${variant}_decision`] === decision
        );

        summaries.push({
          tokenMint,
          variant,
          decision,
          signals: subset.length,
          upFirst: subset.filter((r) => r.path === "UP_FIRST").length,
          downFirst: subset.filter((r) => r.path === "DOWN_FIRST").length,
          bothSameCandle: subset.filter((r) => r.path === "BOTH_SAME_CANDLE").length,
          neither: subset.filter((r) => r.path === "NEITHER").length,
          avgMaxUpsidePct: subset.length
            ? round(subset.reduce((sum, r) => sum + r.maxUpsidePct, 0) / subset.length)
            : null,
          avgMaxDrawdownPct: subset.length
            ? round(subset.reduce((sum, r) => sum + r.maxDrawdownPct, 0) / subset.length)
            : null,
        });
      }
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const detailOutput = path.join(DATA_DIR, `signal-path-detail-${stamp}.csv`);
  const summaryOutput = path.join(DATA_DIR, `signal-path-summary-${stamp}.csv`);

  await writeFile(detailOutput, toCsv(allRows), "utf8");
  await writeFile(summaryOutput, toCsv(summaries), "utf8");

  console.log("\n=== PATH RESULTS BY TOKEN, VARIANT AND DECISION ===");
  console.table(summaries);
  console.log("\nDetailed path report:", detailOutput);
  console.log("Summary report:", summaryOutput);
  console.log(
    "\nCaution: when both thresholds fall inside one candle, OHLC data cannot " +
    "determine which was hit first. This analysis uses baseline A signal entries " +
    "for a common comparison and does not model execution, fees, or slippage."
  );
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];

  function parseLine(line) {
    const cells = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (char === "," && !quoted) {
        cells.push(cell);
        cell = "";
      } else {
        cell += char;
      }
    }

    cells.push(cell);
    return cells;
  }

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""]));
  });
}

main().catch((error) => {
  console.error("[Signal path analysis] Failed:", error);
  process.exitCode = 1;
});
