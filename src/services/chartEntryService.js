import { fetchCandles } from "./ohlcvService.js";

const DEFAULT_OPTIONS = {
  symbol: "",
  timeframe: "1m",
  limit: 120,
  minCandles: 20,
  breakoutLookback: 20,
  supportResistanceLookback: 30,
};

function round(n, d = 6) {
  if (n == null || !Number.isFinite(n)) return null;
  return Number(n.toFixed(d));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sma(values, period) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      out.push(NaN);
      continue;
    }
    const slice = values.slice(i + 1 - period, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    out.push(avg);
  }
  return out;
}

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
        values.slice(i + 1 - period, i + 1).reduce((a, b) => a + b, 0) /
        period;
      prev = seed;
      out.push(seed);
      continue;
    }
    const next = price * k + prev * (1 - k);
    out.push(next);
    prev = next;
  }

  return out;
}

function rsi(values, period = 14) {
  const out = Array(values.length).fill(NaN);
  if (values.length <= period) return out;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] =
    avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      out[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }

  return out;
}

function atr(candles, period = 14) {
  const trs = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      trs.push(c.high - c.low);
      continue;
    }
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    trs.push(tr);
  }
  return sma(trs, period);
}

function highest(values, lookback, endIdx) {
  const start = Math.max(0, endIdx - lookback + 1);
  return Math.max(...values.slice(start, endIdx + 1));
}

function lowest(values, lookback, endIdx) {
  const start = Math.max(0, endIdx - lookback + 1);
  return Math.min(...values.slice(start, endIdx + 1));
}

function percentDiff(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return ((a - b) / b) * 100;
}

function getStructure(price, ema20Val, ema50Val, ema200Val, rsiVal) {
  const strongBull =
    price > ema20Val &&
    ema20Val > ema50Val &&
    ema50Val > ema200Val &&
    rsiVal >= 55;

  const weakBull =
    price > ema50Val &&
    ema20Val > ema50Val &&
    rsiVal >= 50;

  const strongBear =
    price < ema20Val &&
    ema20Val < ema50Val &&
    ema50Val < ema200Val &&
    rsiVal <= 45;

  const weakBear =
    price < ema50Val &&
    ema20Val < ema50Val &&
    rsiVal <= 50;

  if (strongBull) return "bullish";
  if (weakBull) return "weak_bullish";
  if (strongBear) return "bearish";
  if (weakBear) return "weak_bearish";
  return "range";
}

function buildEmptyResult(reason) {
  return {
    ok: false,
    action: "avoid",
    setupType: "no_setup",
    structure: "range",
    confidence: 0,
    score: 0,
    reasons: [],
    warnings: [reason],
    entryZone: { low: null, high: null, ideal: null },
    stopLoss: null,
    invalidation: null,
    targets: { tp1: null, tp2: null },
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
      trendStrength: 0,
      pullbackDepthPct: null,
      distanceFromEma20Pct: null,
      rangeWidthPct: null,
    },
  };
}

export async function analyzeChartEntry(mintAddress, options = {}) {
  const cfg = { ...DEFAULT_OPTIONS, ...options };

  if (!mintAddress || typeof mintAddress !== "string") {
    return buildEmptyResult("mintAddress is required");
  }

  let candles;
  try {
    candles = await fetchCandles(mintAddress, cfg.timeframe, cfg.limit);
  } catch (error) {
    return buildEmptyResult(
      `Failed to fetch candles: ${error?.message || String(error)}`
    );
  }

  if (!Array.isArray(candles) || candles.length < cfg.minCandles) {
    return buildEmptyResult(
      `Not enough candles for chart analysis (need ${cfg.minCandles}+).`
    );
  }

  const clean = candles
    .filter(
      (c) =>
        c &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close)
    )
    .sort((a, b) => a.time - b.time);

  if (clean.length < cfg.minCandles) {
    return buildEmptyResult("Clean candle count is too low after filtering.");
  }

  const closes = clean.map((c) => c.close);
  const highs = clean.map((c) => c.high);
  const lows = clean.map((c) => c.low);

  const ema20 = ema(closes, Math.min(20, clean.length));
const ema50 = ema(closes, Math.min(50, clean.length));
const ema200 = ema(closes, Math.min(100, clean.length));
  const rsi14 = rsi(closes, 14);
  const atr14 = atr(clean, 14);

  const i = clean.length - 1;
  const price = closes[i];
  const ema20Val = ema20[i];
  const ema50Val = ema50[i];
  const ema200Val = ema200[i];
  const rsiVal = rsi14[i];
  const atrVal = atr14[i];

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(ema20Val) ||
    !Number.isFinite(ema50Val) ||
    !Number.isFinite(ema200Val) ||
    !Number.isFinite(rsiVal) ||
    !Number.isFinite(atrVal)
  ) {
    return buildEmptyResult("Indicators are not ready yet.");
  }

  const structure = getStructure(
    price,
    ema20Val,
    ema50Val,
    ema200Val,
    rsiVal
  );

  const support = lowest(lows, cfg.supportResistanceLookback, i);
  const resistance = highest(highs, cfg.supportResistanceLookback, i);
  const breakoutLevel = highest(highs, cfg.breakoutLookback, i - 1);

  const distanceFromEma20Pct = percentDiff(price, ema20Val);
  const rangeWidthPct = percentDiff(resistance, support);

  const recentSwingLow = lowest(lows, 12, i);
  const recentSwingHigh = highest(highs, 12, i);
  const pullbackDepthPct = percentDiff(recentSwingHigh, recentSwingLow);

  const reasons = [];
  const warnings = [];
  let score = 0;

  const trendStrengthBase =
    (price > ema20Val ? 1 : 0) +
    (ema20Val > ema50Val ? 1 : 0) +
    (ema50Val > ema200Val ? 1 : 0) +
    (rsiVal >= 55 ? 1 : 0);

  const trendStrength = clamp((trendStrengthBase / 4) * 100, 0, 100);

  const isBullish =
    structure === "bullish" || structure === "weak_bullish";
  const isBearish =
    structure === "bearish" || structure === "weak_bearish";
  const isRange = structure === "range";

  const breakoutConfirmed =
    price > breakoutLevel &&
    clean[i].close > clean[i].open &&
    clean[i].close > highs[i - 1];

  const nearEma20 = Math.abs(distanceFromEma20Pct) <= 2.5;
  const overextended = distanceFromEma20Pct >= 8;
  const losingMomentum = rsiVal < 50;
  const healthyMomentum = rsiVal >= 55 && rsiVal <= 72;
  const overheated = rsiVal > 78;

  if (isBullish) {
    score += 25;
    reasons.push("Trend structure is bullish.");
  }

  if (healthyMomentum) {
    score += 20;
    reasons.push("RSI shows healthy bullish momentum.");
  } else if (overheated) {
    warnings.push("RSI is overheated; price may be extended.");
    score -= 10;
  } else if (losingMomentum) {
    warnings.push("Momentum is weak.");
    score -= 15;
  }

  if (nearEma20) {
    score += 20;
    reasons.push("Price is near EMA20, giving a cleaner pullback entry.");
  }

  if (breakoutConfirmed) {
    score += 20;
    reasons.push("Breakout above recent resistance is confirmed.");
  }

  if (overextended) {
    score -= 20;
    warnings.push("Price is too extended above EMA20.");
  }

  if (isBearish) {
    score -= 35;
    warnings.push("Trend structure is bearish.");
  }

  if (isRange) {
    score -= 10;
    warnings.push("Market is ranging; breakout confirmation is safer.");
  }

  const entryZone = {
    low: round(Math.min(ema20Val, breakoutLevel)),
    high: round(Math.max(ema20Val, breakoutLevel)),
    ideal: round(ema20Val),
  };

  let action = "avoid";
  let setupType = "no_setup";
  let stopLoss = null;
  let tp1 = null;
  let tp2 = null;
  let invalidation = null;

  if (isBullish && nearEma20 && !overheated && rsiVal >= 52) {
    action = "enter_now";
    setupType = "pullback_long";
    stopLoss = recentSwingLow - atrVal * 0.6;
    tp1 = price + atrVal * 1.5;
    tp2 = price + atrVal * 3;
    invalidation =
      "Lose EMA20 pullback zone and break recent swing low.";
    reasons.push("Pullback entry is active.");
  } else if (isBullish && breakoutConfirmed && !overextended) {
    action = "enter_now";
    setupType = "breakout_long";
    stopLoss = breakoutLevel - atrVal * 0.8;
    tp1 = price + atrVal * 2;
    tp2 = price + atrVal * 4;
    invalidation =
      "Breakout fails and price falls back below breakout level.";
    reasons.push("Breakout entry is active.");
  } else if (isBullish && overextended) {
    action = "wait_pullback";
    setupType = "pullback_long";
    stopLoss = recentSwingLow - atrVal * 0.6;
    tp1 = price + atrVal * 1.5;
    tp2 = price + atrVal * 3;
    invalidation =
      "Do not chase. Wait for retrace toward EMA20/support.";
    warnings.push("Wait for pullback instead of entering at extension.");
  } else if (isRange) {
    action = "wait_breakout";
    setupType = "range_breakout_watch";
    stopLoss = support - atrVal * 0.5;
    tp1 = resistance + atrVal * 1.5;
    tp2 = resistance + atrVal * 3;
    invalidation =
      "Range remains unbroken; avoid mid-range entries.";
    warnings.push("Wait for clean breakout or reclaim before entry.");
  } else {
    action = "avoid";
    setupType = "no_setup";
    stopLoss = recentSwingLow - atrVal * 0.6;
    tp1 = null;
    tp2 = null;
    invalidation =
      "Current chart structure does not support a quality long entry.";
    warnings.push("No strong long setup found.");
  }

  score = clamp(score, 0, 100);

  const confidence =
    action === "enter_now"
      ? clamp(score, 50, 95)
      : action === "wait_pullback" || action === "wait_breakout"
      ? clamp(score - 5, 40, 85)
      : clamp(score - 15, 0, 60);

  return {
    ok: true,
    action,
    setupType,
    structure,
    confidence,
    score,
    reasons,
    warnings,
    entryZone: {
      low: round(entryZone.low),
      high: round(entryZone.high),
      ideal: round(entryZone.ideal),
    },
    stopLoss: round(stopLoss),
    invalidation,
    targets: {
  tp1: round(tp1),
  tp2: round(tp2),
},
profitPotentialPct:
  entryZone.ideal && tp2
    ? round(((tp2 - entryZone.ideal) / entryZone.ideal) * 100, 2)
    : null,
metrics: {
      currentPrice: round(price),
      ema20: round(ema20Val),
      ema50: round(ema50Val),
      ema200: round(ema200Val),
      rsi14: round(rsiVal, 2),
      atr14: round(atrVal),
      support: round(support),
      resistance: round(resistance),
      breakoutLevel: round(breakoutLevel),
      trendStrength: round(trendStrength, 2) ?? 0,
      pullbackDepthPct: round(pullbackDepthPct, 2),
      distanceFromEma20Pct: round(distanceFromEma20Pct, 2),
      rangeWidthPct: round(rangeWidthPct, 2),
    },
  };
}