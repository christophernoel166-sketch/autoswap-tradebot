
import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeChartEntry } from "./chartEntryService.js";

const dataDir = path.resolve("data/chart-replay");

async function main() {
  const { readdir } = await import("node:fs/promises");

  const files = (await readdir(dataDir))
    .filter((name) => name.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No saved candle datasets found in ${dataDir}`);
  }

  const filePath = path.join(dataDir, files[files.length - 1]);
  const dataset = JSON.parse(await readFile(filePath, "utf8"));

  if (!Array.isArray(dataset.candles) || dataset.candles.length < 20) {
    throw new Error("Dataset contains insufficient candles.");
  }

  console.log("[Offline Test] Dataset:", filePath);
  console.log("[Offline Test] Candles:", dataset.candles.length);

  const result = await analyzeChartEntry(dataset.tokenMint, {
    timeframe: dataset.timeframe,
    limit: dataset.candles.length,
    candles: dataset.candles
  });

  console.log("\n[Offline Test] Analyzer result:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[Offline Test] Failed:", error);
  process.exitCode = 1;
});
