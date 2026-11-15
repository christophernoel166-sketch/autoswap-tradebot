
import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzePatterns,
  validateCandles,
} from "./chartPatterns.js";

// -----------------------------------------
// SYNTHETIC CANDLE HELPERS
// -----------------------------------------

function candle(i, open, high, low, close, volume = 100) {
  return {
    time: i + 1,
    open,
    high,
    low,
    close,
    volume,
  };
}

function flatCandles(count = 30, price = 100, volume = 100) {
  return Array.from({ length: count }, (_, i) =>
    candle(
      i,
      price - 0.1,
      price + 0.2,
      price - 0.2,
      price,
      volume
    )
  );
}

function freshBreakoutCandles() {
  const candles = flatCandles(30);

  candles.push(
    candle(30, 100, 103, 99.8, 102.5, 200)
  );

  return candles;
}

function overextendedBreakoutCandles() {
  const candles = flatCandles(30);

  candles.push(
    candle(30, 100, 112, 99.8, 111, 200)
  );

  return candles;
}

function impulsePullbackCandles() {
  const candles = [];
  let price = 100;

  // Strong upward impulse.
  for (let i = 0; i < 25; i++) {
    const nextPrice = price * 1.012;

    candles.push(
      candle(
        i,
        price,
        nextPrice * 1.002,
        price * 0.998,
        nextPrice,
        120
      )
    );

    price = nextPrice;
  }

  // Moderate retracement followed by a bullish candle.
  for (let i = 0; i < 4; i++) {
    const nextPrice =
      price * (i < 3 ? 0.99 : 1.012);

    candles.push(
      candle(
        candles.length,
        price,
        Math.max(price, nextPrice) * 1.002,
        Math.min(price, nextPrice) * 0.998,
        nextPrice,
        130
      )
    );

    price = nextPrice;
  }

  return candles;
}

function repeatedPullbackCandles() {
  const candles = impulsePullbackCandles();

  let price = candles[candles.length - 1].close;

  // Upward continuation after the first pullback.
  for (let i = 0; i < 5; i++) {
    const nextPrice = price * 1.012;

    candles.push(
      candle(
        candles.length,
        price,
        nextPrice * 1.002,
        price * 0.998,
        nextPrice,
        130
      )
    );

    price = nextPrice;
  }

  // A second retracement, then a bullish response.
  for (let i = 0; i < 4; i++) {
    const nextPrice =
      price * (i < 3 ? 0.99 : 1.012);

    candles.push(
      candle(
        candles.length,
        price,
        Math.max(price, nextPrice) * 1.002,
        Math.min(price, nextPrice) * 0.998,
        nextPrice,
        130
      )
    );

    price = nextPrice;
  }

  return candles;
}

// -----------------------------------------
// TESTS
// -----------------------------------------

test("rejects insufficient candles", () => {
  const result = analyzePatterns(flatCandles(10));

  assert.equal(result.valid, false);
  assert.equal(result.reason, "INSUFFICIENT_CANDLES");
});

test("rejects malformed candle data", () => {
  const candles = flatCandles(30);

  candles[4] = {
    ...candles[4],
    high: 1,
    low: 2,
  };

  assert.equal(
    validateCandles(candles).reason,
    "INVALID_CANDLE"
  );
});

test("rejects non-chronological candles", () => {
  const candles = flatCandles(30);

  candles[10].time = candles[9].time;

  assert.equal(
    validateCandles(candles).reason,
    "NON_CHRONOLOGICAL_CANDLES"
  );
});

test("recognizes a pullback after an upward impulse", () => {
  const candles = impulsePullbackCandles();
  const result = analyzePatterns(candles);

 

  assert.equal(result.valid, true);
  assert.equal(result.pattern, "bullish_pullback");
  assert.equal(result.entryEligible, true);
});

test("recognizes a fresh breakout with volume confirmation", () => {
  const result = analyzePatterns(freshBreakoutCandles());

  assert.equal(result.valid, true);
  assert.equal(result.pattern, "fresh_breakout");
  assert.equal(result.entryEligible, true);
  assert.equal(result.volumeConfirmed, true);
  assert.ok(result.extensionPct <= 8);
});


test("does not qualify an overextended breakout as fresh", () => {
  const result = analyzePatterns(overextendedBreakoutCandles());

  assert.notEqual(result.pattern, "fresh_breakout");
  assert.equal(result.entryEligible, false);
});

test("recognizes a pullback after an upward impulse", () => {
  const result = analyzePatterns(impulsePullbackCandles());

  assert.equal(result.valid, true);
  assert.equal(result.pattern, "bullish_pullback");
  assert.equal(result.entryEligible, true);
});



test("recognizes pullbacks at both stages of an uptrend", () => {
  const firstStage = impulsePullbackCandles();
  const secondStage = repeatedPullbackCandles();

  const firstResult = analyzePatterns(firstStage);
  const secondResult = analyzePatterns(secondStage);

  // First pullback must be recognized.
  assert.equal(firstResult.valid, true);
  assert.equal(firstResult.pattern, "bullish_pullback");
  assert.equal(firstResult.entryEligible, true);

  // Second pullback must also be recognized after continuation.
  assert.equal(secondResult.valid, true);
  assert.equal(secondResult.pattern, "bullish_pullback");
  assert.equal(secondResult.entryEligible, true);

  // Both results must report qualifying impulse and retracement sizes.
  for (const result of [firstResult, secondResult]) {
    assert.ok(result.impulsePct >= 8);
    assert.ok(result.pullbackPct >= 2);
    assert.ok(result.pullbackPct <= 12);
  }
});



test("does not confirm a breakout without volume confirmation", () => {
  const candles = flatCandles(30, 100, 100);

  candles.push(
    candle(30, 100, 103, 99.8, 102.5, 101)
  );

  const result = analyzePatterns(candles);

  assert.notEqual(result.pattern, "fresh_breakout");
});


test("rejects a pullback that closes below the impulse low", () => {
  const candles = impulsePullbackCandles();

  const impulseLow = Math.min(
    ...candles.slice(0, -4).map(c => c.low)
  );

  const last = candles[candles.length - 1];

  // Force a close below the impulse low while keeping
  // the candle's OHLC values internally valid.
  candles[candles.length - 1] = {
    ...last,
    open: impulseLow * 0.99,
    high: impulseLow * 1.01,
    low: impulseLow * 0.97,
    close: impulseLow * 0.98,
  };

  const result = analyzePatterns(candles);

  assert.equal(result.valid, true);
  assert.notEqual(result.pattern, "bullish_pullback");
  assert.equal(result.entryEligible, false);
});



test("does not identify a quiet sideways market as a pullback", () => {
  const result = analyzePatterns(flatCandles(30));

  assert.equal(result.pattern, "none");
  assert.equal(result.entryEligible, false);
});
