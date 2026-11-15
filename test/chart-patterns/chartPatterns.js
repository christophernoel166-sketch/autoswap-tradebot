
/**
 * TEST-ONLY chart-pattern prototype.
 * No production services, APIs, database, or trading logic.
 */

function isValidCandle(c) {
  if (!c) return false;

  const values = [c.open, c.high, c.low, c.close, c.volume];

  return (
    values.every(Number.isFinite) &&
    c.low > 0 &&
    c.high >= Math.max(c.open, c.close, c.low) &&
    c.low <= Math.min(c.open, c.close, c.high) &&
    c.volume >= 0
  );
}

export function validateCandles(candles, minimum = 25) {
  if (!Array.isArray(candles) || candles.length < minimum) {
    return { ok: false, reason: "INSUFFICIENT_CANDLES" };
  }

  if (!candles.every(isValidCandle)) {
    return { ok: false, reason: "INVALID_CANDLE" };
  }

  for (let i = 1; i < candles.length; i++) {
    if (Number(candles[i].time) <= Number(candles[i - 1].time)) {
      return { ok: false, reason: "NON_CHRONOLOGICAL_CANDLES" };
    }
  }

  return { ok: true };
}

const maxHigh = candles => Math.max(...candles.map(c => c.high));
const minLow = candles => Math.min(...candles.map(c => c.low));

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function analyzePatterns(candles, options = {}) {
  const cfg = {
    resistanceLookback: 20,
    impulseLookback: 20,
    pullbackLookback: 5,
    breakoutBufferPct: 0.25,
    maxExtensionPct: 8,
    minImpulsePct: 8,
    minPullbackPct: 2,
    maxPullbackPct: 12,
    ...options,
  };

  const validation = validateCandles(
    candles,
    Math.max(cfg.resistanceLookback + 2, 25)
  );

  if (!validation.ok) {
    return {
      valid: false,
      reason: validation.reason,
      pattern: "none",
      entryEligible: false,
    };
  }

  const current = candles[candles.length - 1];
  const previous = candles.slice(0, -1);

  // 1. Fresh breakout: resistance excludes the current candle.
  const resistance = maxHigh(
    previous.slice(-cfg.resistanceLookback)
  );

  const breakoutThreshold =
    resistance * (1 + cfg.breakoutBufferPct / 100);

  const extensionPct =
    ((current.close - resistance) / resistance) * 100;

  const averageVolume = mean(
    previous.slice(-10).map(c => c.volume)
  );

  const volumeConfirmed =
    averageVolume > 0 && current.volume >= averageVolume * 1.2;

  const freshBreakout =
    current.close > breakoutThreshold &&
    current.close > current.open &&
    current.high > resistance &&
    extensionPct <= cfg.maxExtensionPct &&
    volumeConfirmed;

  if (freshBreakout) {
    return {
      valid: true,
      pattern: "fresh_breakout",
      entryEligible: true,
      resistance,
      breakoutThreshold,
      extensionPct,
      volumeConfirmed,
    };
  }

  // 2. Pullback following an impulse.
  // Locate the impulse's low first, then its later high.
  // This avoids treating a sideways range as an impulse.
  const impulseWindow = previous.slice(-cfg.impulseLookback);

  let impulseLow = Infinity;
  let impulseLowIndex = -1;

  for (let i = 0; i < impulseWindow.length; i++) {
    if (impulseWindow[i].low < impulseLow) {
      impulseLow = impulseWindow[i].low;
      impulseLowIndex = i;
    }
  }

  const candlesAfterLow = impulseWindow.slice(impulseLowIndex);
  const impulseHigh = maxHigh(candlesAfterLow);

  const impulsePct =
    ((impulseHigh - impulseLow) / impulseLow) * 100;

  // The recent pullback must happen after the impulse high.
  const pullbackWindow = candles.slice(-cfg.pullbackLookback);
  const pullbackLow = minLow(pullbackWindow);

  const pullbackPct =
    ((impulseHigh - pullbackLow) / impulseHigh) * 100;

  const closesHoldingStructure = pullbackWindow.every(
    c => c.close > impulseLow
  );

  const bullishResponse = current.close > current.open;
  const priceBelowImpulseHigh = current.close < impulseHigh;

  const bullishPullback =
    impulsePct >= cfg.minImpulsePct &&
    pullbackPct >= cfg.minPullbackPct &&
    pullbackPct <= cfg.maxPullbackPct &&
    closesHoldingStructure &&
    bullishResponse &&
    priceBelowImpulseHigh;

  if (bullishPullback) {
    return {
      valid: true,
      pattern: "bullish_pullback",
      entryEligible: true,
      impulseLow,
      impulseHigh,
      impulsePct,
      pullbackPct,
    };
  }

  return {
    valid: true,
    pattern: "none",
    entryEligible: false,
    resistance,
    extensionPct,
    volumeConfirmed,
    impulsePct,
    pullbackPct,
  };
}
