
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fetchCandles } from "./ohlcvService.js";

const OUTPUT_DIR = path.resolve("data/chart-replay");
const TIMEFRAME = "1m";
const DEFAULT_LIMIT = 500;

const TOKEN_MINT = "CSocnzcRpgSCr1naKcNTieWZUxb6rABe45j844m7pump";


function validateCandles(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error("The OHLCV provider returned no candles.");
  }

  const valid = candles.filter((candle) => {
    const values = [
      candle.time,
      candle.open,
      candle.high,
      candle.low,
      candle.close
    ].map(Number);

    const [time, open, high, low, close] = values;

    return (
      values.every(Number.isFinite) &&
      time > 0 &&
      open > 0 &&
      high > 0 &&
      low > 0 &&
      close > 0 &&
      high >= low &&
      high >= open &&
      high >= close &&
      low <= open &&
      low <= close
    );
  });

  if (valid.length !== candles.length) {
    throw new Error(
      `Candle validation failed: ${candles.length - valid.length} invalid candles.`
    );
  }

  const sorted = [...candles].sort((a, b) => a.time - b.time);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].time <= sorted[i - 1].time) {
      throw new Error(
        "Duplicate or out-of-order candle timestamps detected."
      );
    }
  }

  return sorted;
}

function safeFilename(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function main() {
  const tokenMint = TOKEN_MINT.trim();
const requestedLimit = DEFAULT_LIMIT;

  if (!tokenMint) {
    throw new Error(
      "Usage: node src/services/collectChartReplayDataset.js <TOKEN_MINT> [LIMIT]"
    );
  }

  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 120 ||
    requestedLimit > 1000
  ) {
    throw new Error("LIMIT must be an integer between 120 and 1000.");
  }

  console.log("[Replay Collector] Token:", tokenMint);
  console.log("[Replay Collector] Timeframe:", TIMEFRAME);
  console.log("[Replay Collector] Requested candles:", requestedLimit);

  // Uses the existing OHLCV provider. No live trades are submitted.
  const fetched = await fetchCandles(
    tokenMint,
    TIMEFRAME,
    requestedLimit
  );

  const candles = validateCandles(fetched);

  if (candles.length < 120) {
    throw new Error(
      `Only ${candles.length} candles returned; at least 120 are required.`
    );
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const capturedAt = new Date().toISOString();
  const timestampForName = capturedAt.replace(/[:.]/g, "-");

  const filename =
    `${safeFilename(tokenMint)}_${TIMEFRAME}_${timestampForName}.json`;

  const outputPath = path.join(OUTPUT_DIR, filename);

  // Protect previously saved datasets.
  try {
    await access(outputPath);
    throw new Error(`Refusing to overwrite existing file: ${outputPath}`);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const dataset = {
    tokenMint,
    timeframe: TIMEFRAME,
    requestedLimit,
    actualCandleCount: candles.length,
    capturedAt,
    firstCandleTime: candles[0].time,
    lastCandleTime: candles.at(-1).time,
    source: "existing ohlcvService",
    candles
  };

  await writeFile(
    outputPath,
    JSON.stringify(dataset, null, 2),
    { flag: "wx" }
  );

  console.log("\n[Replay Collector] Saved successfully.");
  console.log("File:", outputPath);
  console.log("Candles:", candles.length);
  console.log(
    "First candle:",
    new Date(candles[0].time).toISOString()
  );
  console.log(
    "Last candle:",
    new Date(candles.at(-1).time).toISOString()
  );
}

main().catch((error) => {
  console.error("[Replay Collector] Failed:", error.message);
  process.exitCode = 1;
});
