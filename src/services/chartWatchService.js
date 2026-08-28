// =====================================================
// CREATE CHART WATCH
// =====================================================

export async function createChartWatch({
  walletAddress,
  token,
  chartEntry,
  forecast,
  autoTrade = false,
}) {
  const existing = await ChartWatch.findOne({
    walletAddress,
    mintAddress: token.mintAddress,
    status: "ACTIVE",
  });

  if (existing) {
    return existing;
  }

  // ===================================================
  // DETERMINE SETUP TYPE
  //
  // setupType describes the strategy/setup.
  // currentAction describes the current chart state.
  // ===================================================

  let setupType = null;

  if (
    chartEntry?.action === "wait_breakout" ||
    chartEntry?.setupType === "breakout_long"
  ) {
    setupType = "BREAKOUT_SETUP";
  }

  else if (
    chartEntry?.action === "wait_pullback" ||
    chartEntry?.setupType === "pullback_long"
  ) {
    setupType = "PULLBACK_SETUP";
  }

  // ===================================================
  // ONLY CREATE WATCHES FOR MONITORABLE SETUPS
  // ===================================================

  if (!setupType) {
    return null;
  }

  // ===================================================
  // CURRENT PRICE
  // ===================================================

  const currentPrice =
    chartEntry?.metrics?.currentPrice ??
    token?.priceUsd ??
    null;

  // ===================================================
  // CONFIDENCE
  // ===================================================

  const confidence =
    chartEntry?.metrics?.confidence ??
    forecast?.confidence ??
    forecast?.forecastScore ??
    0;

  // ===================================================
  // CREATE WATCH
  // ===================================================

  return ChartWatch.create({
    // =================================================
    // TOKEN
    // =================================================

    mintAddress:
      token.mintAddress,

    pairAddress:
      token.pairAddress ?? null,

    symbol:
      token.symbol ?? null,

    name:
      token.name ?? null,

    // =================================================
    // USER
    // =================================================

    walletAddress,

    // =================================================
    // SETUP
    // =================================================

    setupType,

    // IMPORTANT:
    // This stores the actual current chart action.
    currentAction:
      chartEntry.action,

    previousAction:
      null,

    trend:
      chartEntry?.metrics?.trend ??
      null,

    confidence,

    // =================================================
    // ENTRY LEVELS
    // =================================================

    entryMin:
      chartEntry?.metrics?.entryMin ??
      null,

    entryMax:
      chartEntry?.metrics?.entryMax ??
      null,

    breakoutLevel:
      chartEntry?.metrics?.breakoutLevel ??
      null,

    invalidationLevel:
      chartEntry?.metrics?.invalidationLevel ??
      null,

    takeProfitLevel:
      chartEntry?.metrics?.takeProfitLevel ??
      null,

    // =================================================
    // PRICE TRACKING
    // =================================================

    initialPrice:
      currentPrice,

    lastPrice:
      currentPrice,

    highestPriceSeen:
      currentPrice,

    lowestPriceSeen:
      currentPrice,

    // =================================================
    // AI
    // =================================================

    forecastScore:
      forecast?.forecastScore ??
      null,

    lastConfidence:
      confidence,

    // =================================================
    // COMPLETE ANALYSIS SNAPSHOT
    // =================================================

    analysisSnapshot: {
      token,
      chartEntry,
      forecast,
    },

    // =================================================
    // AUTO TRADING
    // =================================================

    autoTrade,
  });
}