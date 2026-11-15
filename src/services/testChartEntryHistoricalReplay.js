
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { analyzeChartEntry } from "./chartEntryService.js";

const DATA_DIR = path.resolve("data/chart-replay");
const FORWARD_CANDLES = 15;

// Start after enough history is available for the indicators.
const MIN_HISTORY = 100;

async function main() {
  const files = (await readdir(DATA_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No candle datasets found in ${DATA_DIR}`);
  }

  const filePath = path.join(DATA_DIR, files[files.length - 1]);
  const dataset = JSON.parse(await readFile(filePath, "utf8"));

  const candles = dataset.candles;

  if (!Array.isArray(candles) || candles.length <= MIN_HISTORY) {
    throw new Error(
      `Need more than ${MIN_HISTORY} candles; received ${candles?.length ?? 0}`
    );
  }

  const results = [];
  const lastTestIndex = candles.length - FORWARD_CANDLES;

  console.log("[Historical Replay] Dataset:", filePath);
  console.log("[Historical Replay] Total candles:", candles.length);
  console.log("[Historical Replay] Forward window:", FORWARD_CANDLES);
  console.log("[Historical Replay] Starting replay...");

  for (
    let endIndex = MIN_HISTORY;
    endIndex < lastTestIndex;
    endIndex++
  ) {
    const history = candles.slice(0, endIndex + 1);

    const result = await analyzeChartEntry(dataset.tokenMint, {
      timeframe: dataset.timeframe,
      limit: history.length,
      candles: history
    });

    if (!result?.ok) {
      results.push({
        candleIndex: endIndex,
        action: "analysis_error",
        error: result?.error ?? result?.message ?? "Analysis unsuccessful"
      });
      continue;
    }

    const action = result.action ?? "unknown";

    if (action !== "enter_now") continue;

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
      futureCandles.length === 0
    ) {
      continue;
    }

    const futureHigh = Math.max(
      ...futureCandles.map((candle) => Number(candle.high))
    );

    const futureLow = Math.min(
      ...futureCandles.map((candle) => Number(candle.low))
    );

    results.push({
      candleIndex: endIndex,
      time: history.at(-1).time,
      action,
      setupType: result.setupType,
      score: result.score,
      confidence: result.confidence,
      entryPrice,
      maxUpsidePct: ((futureHigh - entryPrice) / entryPrice) * 100,
      maxDrawdownPct: ((futureLow - entryPrice) / entryPrice) * 100,
      futureCandles: futureCandles.length
    });
  }

  const entries = results.filter((item) => item.action === "enter_now");
  const errors = results.filter((item) => item.action === "analysis_error");

  console.log("\n[Historical Replay] Summary");
  console.log("----------------------------");
  console.log("Candles tested:", lastTestIndex - MIN_HISTORY);
  console.log("Entry signals:", entries.length);
  console.log("Analysis errors:", errors.length);

  if (entries.length > 0) {
    console.log("\nEntry signals and subsequent price movement:");
    console.table(entries);
  } else {
    console.log(
      "\nNo entry signals were produced in the tested portion of this dataset."
    );
  }

  if (errors.length > 0) {
    console.log("\nAnalysis errors:");
    console.table(errors);
  }

  console.log(
    "\nNote: upside and drawdown are observed price excursions, " +
    "not realized returns. Fees, slippage, execution order, and " +
    "whether a stop or target was hit first are not modeled."
  );
}

main().catch((error) => {
  console.error("[Historical Replay] Failed:", error);
  process.exitCode = 1;
});
