import { fetchCandles } from "./ohlcvService.js";

// =====================================================
// DEFAULT OPTIONS
// =====================================================

const DEFAULT_OPTIONS = {
  symbol: "",
  timeframe: "1m",
  limit: 120,

  minCandles: 20,

  breakoutLookback: 20,
  supportResistanceLookback: 30,

  pullbackEmaTolerancePct: 2.5,
  breakoutBufferPct: 0.25,

  minTrendStrengthForEntry: 50,

  rsiPullbackMin: 50,
  rsiEntryMin: 52,
  rsiHealthyMax: 72,

  maxExtensionPct: 8,
};

// =====================================================
// HELPERS
// =====================================================

function round(n, d = 6) {
  if (n == null || !Number.isFinite(n)) {
    return null;
  }

  return Number(n.toFixed(d));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function percentDiff(a, b) {
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    b === 0
  ) {
    return 0;
  }

  return ((a - b) / b) * 100;
}

// =====================================================
// SMA
// =====================================================

function sma(values, period) {
  const out = [];

  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      out.push(NaN);
      continue;
    }

    const slice =
      values.slice(
        i + 1 - period,
        i + 1
      );

    const avg =
      slice.reduce(
        (a, b) => a + b,
        0
      ) / period;

    out.push(avg);
  }

  return out;
}

// =====================================================
// EMA
// =====================================================

function ema(values, period) {
  const out = [];
  const k = 2 / (period + 1);

  let prev = null;

  for (let i = 0; i < values.length; i++) {
    const price = values[i];

    if (i + 1 < period) {
      out.push(NaN);
      continue;
    }

    if (prev == null) {
      const seed =
        values
          .slice(i + 1 - period, i + 1)
          .reduce(
            (a, b) => a + b,
            0
          ) / period;

      prev = seed;
      out.push(seed);

      continue;
    }

    const next =
      price * k +
      prev * (1 - k);

    out.push(next);

    prev = next;
  }

  return out;
}

// =====================================================
// RSI
// =====================================================

function rsi(values, period = 14) {
  const out =
    Array(values.length).fill(NaN);

  if (values.length <= period) {
    return out;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff =
      values[i] -
      values[i - 1];

    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain =
    gains / period;

  let avgLoss =
    losses / period;

  out[period] =
    avgLoss === 0
      ? 100
      : 100 -
        100 /
          (1 +
            avgGain /
              avgLoss);

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const diff =
      values[i] -
      values[i - 1];

    const gain =
      diff > 0 ? diff : 0;

    const loss =
      diff < 0
        ? Math.abs(diff)
        : 0;

    avgGain =
      (avgGain * (period - 1) +
        gain) /
      period;

    avgLoss =
      (avgLoss * (period - 1) +
        loss) /
      period;

    if (avgLoss === 0) {
      out[i] = 100;
    } else {
      const rs =
        avgGain /
        avgLoss;

      out[i] =
        100 -
        100 /
          (1 + rs);
    }
  }

  return out;
}

// =====================================================
// ATR
// =====================================================

function atr(candles, period = 14) {
  const trs = [];

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {
    const c = candles[i];

    if (i === 0) {
      trs.push(
        c.high - c.low
      );

      continue;
    }

    const prevClose =
      candles[i - 1].close;

    const tr =
      Math.max(
        c.high - c.low,
        Math.abs(
          c.high -
            prevClose
        ),
        Math.abs(
          c.low -
            prevClose
        )
      );

    trs.push(tr);
  }

  return sma(
    trs,
    period
  );
}

// =====================================================
// HIGHEST / LOWEST
// =====================================================

function highest(
  values,
  lookback,
  endIdx
) {
  const start =
    Math.max(
      0,
      endIdx -
        lookback +
        1
    );

  return Math.max(
    ...values.slice(
      start,
      endIdx + 1
    )
  );
}

function lowest(
  values,
  lookback,
  endIdx
) {
  const start =
    Math.max(
      0,
      endIdx -
        lookback +
        1
    );

  return Math.min(
    ...values.slice(
      start,
      endIdx + 1
    )
  );
}

// =====================================================
// STRUCTURE
// =====================================================

function getStructure(
  price,
  ema20Val,
  ema50Val,
  ema200Val,
  rsiVal
) {
  const strongBull =
    price > ema20Val &&
    ema20Val > ema50Val &&
    ema50Val > ema200Val &&
    rsiVal >= 55;

  const weakBull =
    price > ema50Val &&
    ema20Val >= ema50Val &&
    rsiVal >= 50;

  const strongBear =
    price < ema20Val &&
    ema20Val < ema50Val &&
    ema50Val < ema200Val &&
    rsiVal <= 45;

  const weakBear =
    price < ema50Val &&
    ema20Val <= ema50Val &&
    rsiVal <= 50;

  if (strongBull) {
    return "bullish";
  }

  if (weakBull) {
    return "weak_bullish";
  }

  if (strongBear) {
    return "bearish";
  }

  if (weakBear) {
    return "weak_bearish";
  }

  return "range";
}

// =====================================================
// EMPTY RESULT
// =====================================================

function buildEmptyResult(reason) {
  return {
    ok: false,

    score: 0,

    confidence: 0,

    verdict: {
      title: "No Chart Data",
      level: "UNKNOWN",
      color: "gray",
      confidence: 0,
      summary: [reason],
    },

    action: "avoid",

    setupType: "no_setup",

    structure: "range",

    reasons: [],

    warnings: [reason],

    entryZone: {
      low: null,
      high: null,
      ideal: null,
    },

    stopLoss: null,

    invalidation: null,

    targets: {
      tp1: null,
      tp2: null,
    },

    profitPotentialPct: null,

    metrics: {
      currentPrice: null,
      ema20: null,
      ema50: null,
      ema200: null,
      rsi14: null,
      atr14: null,

      support: null,
      resistance: null,

      breakoutLevel: null,

      trend: "range",
      trendStrength: 0,

      pullbackDepthPct: null,
      distanceFromEma20Pct: null,
      rangeWidthPct: null,

      entryMin: null,
      entryMax: null,

      invalidationLevel: null,
      takeProfitLevel: null,
    },
  };
}

// =====================================================
// MAIN ANALYSIS
// =====================================================

export async function analyzeChartEntry(
  mintAddress,
  options = {}
) {
  const cfg = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // ===================================================
  // VALIDATE MINT
  // ===================================================

  if (
    !mintAddress ||
    typeof mintAddress !== "string"
  ) {
    return buildEmptyResult(
      "mintAddress is required"
    );
  }

  // ===================================================
  // FETCH CANDLES
  // ===================================================

  let candles;

  try {
    candles =
      await fetchCandles(
        mintAddress,
        cfg.timeframe,
        cfg.limit
      );
  } catch (error) {
    return buildEmptyResult(
      `Failed to fetch candles: ${
        error?.message ||
        String(error)
      }`
    );
  }

  // ===================================================
  // VALIDATE CANDLES
  // ===================================================

  if (
    !Array.isArray(candles) ||
    candles.length <
      cfg.minCandles
  ) {
    return buildEmptyResult(
      `Not enough candles for chart analysis (need ${cfg.minCandles}+).`
    );
  }

  const clean =
    candles
      .filter(
        (c) =>
          c &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      )
      .sort(
        (a, b) =>
          a.time - b.time
      );

  if (
    clean.length <
    cfg.minCandles
  ) {
    return buildEmptyResult(
      "Clean candle count is too low after filtering."
    );
  }

  // ===================================================
  // PRICE SERIES
  // ===================================================

  const closes =
    clean.map(
      (c) => c.close
    );

  const highs =
    clean.map(
      (c) => c.high
    );

  const lows =
    clean.map(
      (c) => c.low
    );

  // ===================================================
  // INDICATORS
  // ===================================================

  const ema20 =
    ema(
      closes,
      Math.min(
        20,
        clean.length
      )
    );

  const ema50 =
    ema(
      closes,
      Math.min(
        50,
        clean.length
      )
    );

  /*
   * Keep the adaptive EMA200 behavior because
   * meme-coin scans often do not have 200 candles.
   */
  const ema200 =
    ema(
      closes,
      Math.min(
        100,
        clean.length
      )
    );

  const rsi14 =
    rsi(
      closes,
      14
    );

  const atr14 =
    atr(
      clean,
      14
    );

  const i =
    clean.length - 1;

  const previousIndex =
    Math.max(
      0,
      i - 1
    );

  const price =
    closes[i];

  const previousPrice =
    closes[
      previousIndex
    ];

  const ema20Val =
    ema20[i];

  const ema50Val =
    ema50[i];

  const ema200Val =
    ema200[i];

  const rsiVal =
    rsi14[i];

  const atrVal =
    atr14[i];

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(ema20Val) ||
    !Number.isFinite(ema50Val) ||
    !Number.isFinite(ema200Val) ||
    !Number.isFinite(rsiVal) ||
    !Number.isFinite(atrVal)
  ) {
    return buildEmptyResult(
      "Indicators are not ready yet."
    );
  }

  // ===================================================
  // STRUCTURE
  // ===================================================

  const structure =
    getStructure(
      price,
      ema20Val,
      ema50Val,
      ema200Val,
      rsiVal
    );

  const isBullish =
    structure ===
      "bullish" ||
    structure ===
      "weak_bullish";

  const isBearish =
    structure ===
      "bearish" ||
    structure ===
      "weak_bearish";

  const isRange =
    structure ===
    "range";

  // ===================================================
  // SUPPORT / RESISTANCE
  // ===================================================

  const support =
    lowest(
      lows,
      cfg.supportResistanceLookback,
      i
    );

  const resistance =
    highest(
      highs,
      cfg.supportResistanceLookback,
      i
    );

  /*
   * Exclude the current candle when determining
   * the breakout level.
   *
   * This prevents the current candle from moving
   * the resistance level upward together with price.
   */
  const breakoutReferenceIndex =
    Math.max(
      0,
      i - 1
    );

  const breakoutLevel =
    highest(
      highs,
      cfg.breakoutLookback,
      breakoutReferenceIndex
    );

  // ===================================================
  // PRICE RELATIONSHIPS
  // ===================================================

  const distanceFromEma20Pct =
    percentDiff(
      price,
      ema20Val
    );

  const rangeWidthPct =
    percentDiff(
      resistance,
      support
    );

  const recentSwingLow =
    lowest(
      lows,
      12,
      i
    );

  const recentSwingHigh =
    highest(
      highs,
      12,
      i
    );

  const pullbackDepthPct =
    percentDiff(
      recentSwingHigh,
      recentSwingLow
    );

  // ===================================================
  // CANDLE INFORMATION
  // ===================================================

  const currentCandle =
    clean[i];

  const previousCandle =
    clean[previousIndex];

  const currentBullishCandle =
    currentCandle.close >
    currentCandle.open;

  const currentBearishCandle =
    currentCandle.close <
    currentCandle.open;

  const previousBullishCandle =
    previousCandle.close >
    previousCandle.open;

  // ===================================================
  // MOMENTUM
  // ===================================================

  const healthyMomentum =
    rsiVal >=
      cfg.rsiEntryMin &&
    rsiVal <=
      cfg.rsiHealthyMax;

  const pullbackMomentum =
    rsiVal >=
      cfg.rsiPullbackMin;

  const losingMomentum =
    rsiVal < 50;

  const overheated =
    rsiVal > 78;

  // ===================================================
  // EMA ZONE
  // ===================================================

  const nearEma20 =
    Math.abs(
      distanceFromEma20Pct
    ) <=
    cfg.pullbackEmaTolerancePct;

  const belowEma20 =
    price <
    ema20Val;

  const aboveEma20 =
    price >
    ema20Val;

  const overextended =
    distanceFromEma20Pct >=
    cfg.maxExtensionPct;

  // ===================================================
  // PULLBACK ZONE
  // ===================================================

  /*
   * The pullback zone is deliberately centered
   * around EMA20 but bounded by recent structure.
   *
   * This gives the monitor an actual price zone
   * to watch instead of simply waiting for an
   * arbitrary percentage.
   */

  const pullbackZoneLow =
    Math.min(
      ema20Val,
      recentSwingLow +
        atrVal * 0.25
    );

  const pullbackZoneHigh =
    Math.max(
      ema20Val,
      ema20Val +
        atrVal * 0.25
    );

  const priceInsidePullbackZone =
    price >=
      pullbackZoneLow &&
    price <=
      pullbackZoneHigh;

  // ===================================================
  // BREAKOUT DETECTION
  // ===================================================

  const breakoutBuffer =
    breakoutLevel *
    (cfg.breakoutBufferPct /
      100);

  const breakoutPrice =
    breakoutLevel +
    breakoutBuffer;

  const breakoutConfirmed =
    price >
      breakoutPrice &&
    currentCandle.close >
      currentCandle.open &&
    currentCandle.close >
      breakoutLevel &&
    currentCandle.high >
      breakoutLevel;

  /*
   * Detect whether price is approaching resistance.
   */

  const distanceToResistancePct =
    percentDiff(
      price,
      resistance
    );

  const nearResistance =
    distanceToResistancePct >=
      -2 &&
    distanceToResistancePct <=
      3;

  // ===================================================
  // SCORE
  // ===================================================

  const reasons = [];
  const warnings = [];

  let score = 0;

  // ===================================================
  // TREND SCORE
  // ===================================================

  const trendStrengthBase =
    (price > ema20Val
      ? 1
      : 0) +
    (ema20Val > ema50Val
      ? 1
      : 0) +
    (ema50Val > ema200Val
      ? 1
      : 0) +
    (rsiVal >= 55
      ? 1
      : 0);

  const trendStrength =
    clamp(
      (trendStrengthBase /
        4) *
        100,
      0,
      100
    );

  // ===================================================
  // TREND CONTRIBUTION
  // ===================================================

  if (isBullish) {
    score += 25;

    reasons.push(
      "Trend structure is bullish."
    );
  }

  if (isBearish) {
    score -= 35;

    warnings.push(
      "Trend structure is bearish."
    );
  }

  if (isRange) {
    score -= 10;

    warnings.push(
      "Market is ranging; confirmation is required."
    );
  }

  // ===================================================
  // MOMENTUM CONTRIBUTION
  // ===================================================

  if (healthyMomentum) {
    score += 20;

    reasons.push(
      "RSI shows healthy bullish momentum."
    );
  } else if (overheated) {
    score -= 10;

    warnings.push(
      "RSI is overheated; price may be extended."
    );
  } else if (losingMomentum) {
    score -= 15;

    warnings.push(
      "Momentum is weakening."
    );
  }

  // ===================================================
  // EMA CONTRIBUTION
  // ===================================================

  if (nearEma20) {
    score += 20;

    reasons.push(
      "Price is near the EMA20 pullback zone."
    );
  }

  if (overextended) {
    score -= 20;

    warnings.push(
      "Price is extended above EMA20."
    );
  }

  // ===================================================
  // BREAKOUT CONTRIBUTION
  // ===================================================

  if (breakoutConfirmed) {
    score += 25;

    reasons.push(
      "Price has confirmed a breakout above resistance."
    );
  } else if (nearResistance) {
    score += 5;

    reasons.push(
      "Price is approaching resistance."
    );
  }

  // ===================================================
  // ENTRY / SETUP VARIABLES
  // ===================================================

  let action =
    "avoid";

  let setupType =
    "no_setup";

  let stopLoss =
    null;

  let tp1 =
    null;

  let tp2 =
    null;

  let invalidation =
    null;

  let entryLow =
    null;

  let entryHigh =
    null;

  let idealEntry =
    null;

  // ===================================================
  // SETUP 1 — PULLBACK ENTRY
  // ===================================================

  /*
   * A pullback is not automatically an entry.
   *
   * We require:
   *
   * 1. Bullish structure
   * 2. Price around EMA20
   * 3. RSI still healthy enough
   * 4. Price not overheated
   *
   * This is what allows:
   *
   * WAIT_PULLBACK
   *       ↓
   * ENTER_NOW
   */

  const validPullbackEntry =
    isBullish &&
    priceInsidePullbackZone &&
    !overheated &&
    rsiVal >=
      cfg.rsiEntryMin &&
    trendStrength >=
      cfg.minTrendStrengthForEntry;

  // ===================================================
  // SETUP 2 — BREAKOUT ENTRY
  // ===================================================

  const validBreakoutEntry =
    isBullish &&
    breakoutConfirmed &&
    !overheated &&
    rsiVal >=
      cfg.rsiPullbackMin &&
    trendStrength >=
      cfg.minTrendStrengthForEntry;

  // ===================================================
  // PULLBACK WATCH
  // ===================================================

  const shouldWaitForPullback =
    isBullish &&
    (
      overextended ||
      (
        price >
          ema20Val &&
        !validPullbackEntry
      )
    );

  // ===================================================
  // BREAKOUT WATCH
  // ===================================================

  const shouldWaitForBreakout =
    (
      isRange ||
      (
        isBullish &&
        nearResistance &&
        !breakoutConfirmed
      )
    ) &&
    !validPullbackEntry;

  // ===================================================
  // INVALIDATION
  // ===================================================

  const pullbackInvalidated =
    isBearish ||
    price <
      recentSwingLow -
        atrVal * 0.25;

  const breakoutInvalidated =
    price <
      breakoutLevel -
        atrVal * 0.25;

  // ===================================================
  // PRIORITY 1 — PULLBACK ENTRY
  // ===================================================

  if (validPullbackEntry) {

    action =
      "enter_now";

    setupType =
      "pullback_long";

    entryLow =
      pullbackZoneLow;

    entryHigh =
      pullbackZoneHigh;

    idealEntry =
      ema20Val;

    stopLoss =
      recentSwingLow -
      atrVal * 0.6;

    tp1 =
      price +
      atrVal * 1.5;

    tp2 =
      price +
      atrVal * 3;

    invalidation =
      "Lose the EMA20 pullback zone and break the recent swing low.";

    reasons.push(
      "Pullback has reached a valid entry zone."
    );

    reasons.push(
      "Trend and momentum remain strong enough for entry."
    );
  }

  // ===================================================
  // PRIORITY 2 — BREAKOUT ENTRY
  // ===================================================

  else if (validBreakoutEntry) {

    action =
      "enter_now";

    setupType =
      "breakout_long";

    entryLow =
      breakoutLevel;

    entryHigh =
      breakoutPrice;

    idealEntry =
      price;

    stopLoss =
      breakoutLevel -
      atrVal * 0.8;

    tp1 =
      price +
      atrVal * 2;

    tp2 =
      price +
      atrVal * 4;

    invalidation =
      "Breakout fails and price falls back below the breakout level.";

    reasons.push(
      "Breakout entry is confirmed."
    );

    reasons.push(
      "Price closed above the breakout level with bullish momentum."
    );
  }

  // ===================================================
  // PRIORITY 3 — WAIT FOR PULLBACK
  // ===================================================

  else if (
    shouldWaitForPullback &&
    !pullbackInvalidated
  ) {

    action =
      "wait_pullback";

    setupType =
      "pullback_long";

    entryLow =
      pullbackZoneLow;

    entryHigh =
      pullbackZoneHigh;

    idealEntry =
      ema20Val;

    stopLoss =
      recentSwingLow -
      atrVal * 0.6;

    tp1 =
      ema20Val +
      atrVal * 1.5;

    tp2 =
      ema20Val +
      atrVal * 3;

    invalidation =
      "Pullback becomes invalid if price loses the recent swing low.";

    warnings.push(
      "Wait for price to retrace into the EMA20 pullback zone."
    );
  }

  // ===================================================
  // PRIORITY 4 — WAIT FOR BREAKOUT
  // ===================================================

  else if (
    shouldWaitForBreakout &&
    !breakoutInvalidated
  ) {

    action =
      "wait_breakout";

    setupType =
      "range_breakout_watch";

    entryLow =
      breakoutLevel;

    entryHigh =
      breakoutPrice;

    idealEntry =
      breakoutLevel;

    stopLoss =
      support -
      atrVal * 0.5;

    tp1 =
      breakoutLevel +
      atrVal * 1.5;

    tp2 =
      breakoutLevel +
      atrVal * 3;

    invalidation =
      "Avoid entry while price remains below resistance or breaks the range structure.";

    warnings.push(
      "Wait for a clean breakout and confirmation."
    );
  }

  // ===================================================
  // PRIORITY 5 — INVALID / AVOID
  // ===================================================

  else {

    action =
      "avoid";

    setupType =
      "no_setup";

    entryLow =
      null;

    entryHigh =
      null;

    idealEntry =
      null;

    stopLoss =
      recentSwingLow -
      atrVal * 0.6;

    tp1 =
      null;

    tp2 =
      null;

    invalidation =
      "Current chart structure does not support a quality long entry.";

    warnings.push(
      "No strong long setup is currently confirmed."
    );
  }

  // ===================================================
  // SCORE NORMALIZATION
  // ===================================================

  score =
    clamp(
      score,
      0,
      100
    );

  // ===================================================
  // CONFIDENCE
  // ===================================================

  let confidence;

  if (
    action ===
    "enter_now"
  ) {

    confidence =
      clamp(
        score,
        50,
        95
      );

  } else if (
    action ===
      "wait_pullback" ||
    action ===
      "wait_breakout"
  ) {

    confidence =
      clamp(
        score - 5,
        40,
        85
      );

  } else {

    confidence =
      clamp(
        score - 15,
        0,
        60
      );
  }

  // ===================================================
  // VERDICT
  // ===================================================

  let verdictTitle =
    "Neutral Chart";

  let verdictLevel =
    "MEDIUM";

  let verdictColor =
    "yellow";

  if (
    action ===
    "enter_now"
  ) {

    verdictTitle =
      "High Probability Entry";

    verdictLevel =
      "LOW";

    verdictColor =
      "green";

  } else if (
    action ===
    "wait_pullback"
  ) {

    verdictTitle =
      "Wait For Pullback";

    verdictLevel =
      "LOW_MEDIUM";

    verdictColor =
      "lime";

  } else if (
    action ===
    "wait_breakout"
  ) {

    verdictTitle =
      "Await Breakout";

    verdictLevel =
      "MEDIUM";

    verdictColor =
      "orange";

  } else {

    verdictTitle =
      "Avoid Entry";

    verdictLevel =
      "HIGH";

    verdictColor =
      "red";
  }

  const verdict = {

    title:
      verdictTitle,

    level:
      verdictLevel,

    color:
      verdictColor,

    confidence,

    summary:
      warnings.length
        ? warnings
        : reasons,
  };

  // ===================================================
  // PROFIT POTENTIAL
  // ===================================================

  const profitPotentialPct =
    idealEntry &&
    tp2 &&
    idealEntry > 0
      ? round(
          (
            (tp2 -
              idealEntry) /
            idealEntry
          ) *
            100,
          2
        )
      : null;

  // ===================================================
  // RETURN COMPLETE ANALYSIS
  // ===================================================

  return {

    ok: true,

    score,

    confidence,

    verdict,

    action,

    setupType,

    structure,

    reasons,

    warnings,

    // =================================================
    // ENTRY ZONE
    // =================================================

    entryZone: {

      low:
        round(entryLow),

      high:
        round(entryHigh),

      ideal:
        round(idealEntry),
    },

    // =================================================
    // RISK
    // =================================================

    stopLoss:
      round(stopLoss),

    invalidation,

    targets: {

      tp1:
        round(tp1),

      tp2:
        round(tp2),
    },

    profitPotentialPct,

    // =================================================
    // METRICS
    // =================================================

    metrics: {

      currentPrice:
        round(price),

      ema20:
        round(ema20Val),

      ema50:
        round(ema50Val),

      ema200:
        round(ema200Val),

      rsi14:
        round(
          rsiVal,
          2
        ),

      atr14:
        round(atrVal),

      support:
        round(support),

      resistance:
        round(resistance),

      breakoutLevel:
        round(breakoutLevel),

      // IMPORTANT:
      // These fields are consumed by
      // chartWatchService.js

      trend:
        structure,

      trendStrength:
        round(
          trendStrength,
          2
        ) ?? 0,

      entryMin:
        round(entryLow),

      entryMax:
        round(entryHigh),

      invalidationLevel:
        round(stopLoss),

      takeProfitLevel:
        round(tp1),

      pullbackDepthPct:
        round(
          pullbackDepthPct,
          2
        ),

      distanceFromEma20Pct:
        round(
          distanceFromEma20Pct,
          2
        ),

      rangeWidthPct:
        round(
          rangeWidthPct,
          2
        ),

      distanceToResistancePct:
        round(
          distanceToResistancePct,
          2
        ),

      priceInsidePullbackZone,

      breakoutConfirmed,

      nearResistance,

      overextended,

      healthyMomentum,

      losingMomentum,

      currentBullishCandle,

      previousBullishCandle,

      aboveEma20,

      belowEma20,
    },
  };
}