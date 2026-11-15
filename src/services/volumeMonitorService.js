
import { fetchCandles } from "./ohlcvService.js";

const ROLLING_WINDOWS_MINUTES = [1, 2, 3, 5, 10];
const MAX_HISTORY_MINUTES = 10;
const CANDLE_INTERVAL_MS = 60_000;

// A short in-memory history shared by all watches for the same token.
const volumeHistoryByMint = new Map();


function getClosedCandles(candles, now = Date.now()) {
  return candles
    .map((candle) => ({
      time: Number(candle.time),
      volume: Number(candle.volume),
    }))
    .filter(
      (candle) =>
        Number.isFinite(candle.time) &&
        Number.isFinite(candle.volume) &&
        candle.volume >= 0 &&
        candle.time % CANDLE_INTERVAL_MS === 0 &&
        candle.time + CANDLE_INTERVAL_MS <= now
    )
    .sort((a, b) => a.time - b.time);
}


function classifyVolumeTrend(samples) {
  // Require three consecutive completed one-minute readings.
  if (samples.length < 3) {
    return {
      status: "INSUFFICIENT_DATA",
      description: "Waiting for more completed one-minute readings",
    };
  }

  const recent = samples.slice(-3);
  const [first, second, third] = recent.map((item) => item.volume);

  if (first < second && second < third) {
    return {
      status: "CONSISTENTLY_INCREASING",
      description: "Volume increased across the last three readings",
    };
  }

  if (first > second && second > third) {
    return {
      status: "CONSISTENTLY_DECREASING",
      description: "Volume decreased across the last three readings",
    };
  }

  return {
    status: "MIXED",
    description: "Volume has no consistent three-reading trend",
  };
}


function buildVolumeSnapshot(samples, now = Date.now()) {
  const latest = samples.at(-1) || null;
  const rollingWindows = {};

  // Use the latest completed candle as the reference point.
  // This avoids incorrectly requiring a candle to exist for
  // the currently unfinished minute.
  for (const minutes of ROLLING_WINDOWS_MINUTES) {
    const selected = latest
      ? samples.filter(
          (sample) =>
            sample.time <= latest.time &&
            sample.time > latest.time - minutes * CANDLE_INTERVAL_MS
        )
      : [];

    const uniqueMinutes = new Set(
      selected.map((sample) => sample.time)
    );

    const complete =
      uniqueMinutes.size === minutes &&
      selected.length === minutes &&
      selected.every(
        (sample, index) =>
          index === 0 ||
          sample.time - selected[index - 1].time === CANDLE_INTERVAL_MS
      );

    rollingWindows[`${minutes}m`] = {
      minutes,
      volume: selected.reduce(
        (total, sample) => total + sample.volume,
        0
      ),
      sampleCount: uniqueMinutes.size,
      complete,
    };
  }

  // Only classify trend when the last three completed candles
  // have consecutive timestamps.
  const recent = samples.slice(-3);
  let trend;

  const consecutive =
    recent.length === 3 &&
    recent[1].time - recent[0].time === CANDLE_INTERVAL_MS &&
    recent[2].time - recent[1].time === CANDLE_INTERVAL_MS;

  if (!consecutive) {
    trend = {
      status: "INSUFFICIENT_DATA",
      description: "Waiting for three consecutive completed one-minute candles",
    };
  } else {
    trend = classifyVolumeTrend(recent);
  }

  return {
    latestMinute: latest
      ? {
          time: latest.time,
          volume: latest.volume,
        }
      : null,
    rollingWindows,
    trend,
    sampleCount: samples.length,
    updatedAt: new Date(now).toISOString(),
    volumeUnit: "provider-reported volume units",
  };
}

/**
 * Read-only volume collection.
 * Does not call chart-entry decisions or any trade-execution functions.
 */
export async function collectVolumeSnapshot(tokenMint) {
  const mint = String(tokenMint || "").trim();

  if (!mint) {
    throw new Error("tokenMint is required for volume collection");
  }

  // Request extra candles to cover the 10-minute window and gaps.
  const candles = await fetchCandles(mint, "1m", 20, {
    bypassCache: true,
  });

  const closedCandles = getClosedCandles(candles);

  if (closedCandles.length === 0) {
    throw new Error("No completed one-minute candles are available");
  }

  const existing = volumeHistoryByMint.get(mint) || new Map();

  // Candle timestamps are keys, so repeated worker cycles cannot
  // count the same minute twice.
  for (const candle of closedCandles) {
    existing.set(candle.time, {
      time: candle.time,
      volume: candle.volume,
    });
  }

  const cutoff = Date.now() -
    MAX_HISTORY_MINUTES * CANDLE_INTERVAL_MS;

  for (const time of existing.keys()) {
    if (time < cutoff) {
      existing.delete(time);
    }
  }

  const samples = [...existing.values()].sort(
    (a, b) => a.time - b.time
  );

  volumeHistoryByMint.set(mint, existing);

  return buildVolumeSnapshot(samples);
}
