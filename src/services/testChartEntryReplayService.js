
import { analyzeChartEntry } from "./chartEntryReplayService.js";

// Generate deterministic synthetic candles for a basic smoke test.
// This checks execution only; it does not establish predictive accuracy.
function createTestCandles(count = 120) {
  const candles = [];
  let previousClose = 1;

  for (let i = 0; i < count; i++) {
    let change;

    if (i < 70) {
      change = 0.001;
    } else if (i < 90) {
      change = i % 2 === 0 ? 0.004 : -0.003;
    } else if (i < 105) {
      change = i % 2 === 0 ? -0.002 : 0.001;
    } else {
      change = i % 2 === 0 ? 0.003 : 0.001;
    }

    const open = previousClose;
    const close = open * (1 + change);
    const high = Math.max(open, close) * 1.002;
    const low = Math.min(open, close) * 0.998;

    candles.push({
      time: 1_700_000_000 + i * 60,
      open,
      high,
      low,
      close,
      volume: 1000 + i * 5,
    });

    previousClose = close;
  }

  return candles;
}

async function main() {
  const candles = createTestCandles();

  const result = await analyzeChartEntry(
    "OFFLINE_REPLAY_TEST",
    {
      candles,
      timeframe: "1m",
      minCandles: 20,
    }
  );

  console.log("Offline replay smoke test");
  console.log("-------------------------");
  console.log("Candles supplied:", candles.length);
  console.log("Analysis successful:", result.ok);
  console.log("Action:", result.action);
  console.log("Setup:", result.setupType);
  console.log("Score:", result.score);
  console.log("Warnings:", result.warnings);

  if (!result.ok) {
    console.error("Replay test did not complete:", result.warnings);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Offline replay test failed:", error);
  process.exitCode = 1;
});
