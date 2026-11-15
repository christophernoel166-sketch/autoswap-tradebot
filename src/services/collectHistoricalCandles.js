
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCandles } from "./ohlcvService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_MINT =
  "CA8q2mkYWZnUNqYmf6pxyxAPZsmSe2EG9P7hHMW5pump";

const TIMEFRAME = "1m";
const LIMIT = 500;

async function main() {
  console.log("[Replay Data] Fetching historical candles...");

  const candles = await fetchCandles(
    TOKEN_MINT,
    TIMEFRAME,
    LIMIT
  );

  if (!Array.isArray(candles) || candles.length < 20) {
    throw new Error(
      `Insufficient candles returned: ${candles?.length ?? 0}`
    );
  }

  const validCandles = candles.filter((c) =>
    [c.time, c.open, c.high, c.low, c.close, c.volume]
      .every((value) => Number.isFinite(Number(value))) &&
    Number(c.open) > 0 &&
    Number(c.high) >= Number(c.low) &&
    Number(c.low) > 0 &&
    Number(c.volume) >= 0
  );

  if (validCandles.length < 20) {
    throw new Error(
      `Only ${validCandles.length} valid candles remain`
    );
  }

  const outputDir = path.resolve(
    __dirname,
    "../../data/chart-replay"
  );

  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const filename =
    `${TOKEN_MINT}_${TIMEFRAME}_${timestamp}.json`;

  const outputPath = path.join(outputDir, filename);

  const dataset = {
    source: "ohlcvService.fetchCandles",
    tokenMint: TOKEN_MINT,
    timeframe: TIMEFRAME,
    requestedLimit: LIMIT,
    candleCount: validCandles.length,
    firstCandleTime: validCandles[0].time,
    lastCandleTime: validCandles[validCandles.length - 1].time,
    collectedAt: new Date().toISOString(),
    candles: validCandles
  };

  await writeFile(
    outputPath,
    JSON.stringify(dataset, null, 2),
    "utf8"
  );

  console.log("[Replay Data] Saved successfully.");
  console.log("File:", outputPath);
  console.log("Candles:", dataset.candleCount);
  console.log("First candle:", dataset.firstCandleTime);
  console.log("Last candle:", dataset.lastCandleTime);
}

main().catch((error) => {
  console.error("[Replay Data] Collection failed:", error.message);
  process.exitCode = 1;
});
