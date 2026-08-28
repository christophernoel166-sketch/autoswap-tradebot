import ChartWatch from "../../models/ChartWatch.js";

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
  if (!walletAddress) {
    throw new Error("walletAddress is required");
  }

  if (!token?.mintAddress) {
    throw new Error("token.mintAddress is required");
  }

  if (!chartEntry?.action) {
    throw new Error("chartEntry.action is required");
  }

  // ===================================================
  // CHECK FOR EXISTING ACTIVE WATCH
  // ===================================================

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
  // setupType = strategy/setup category
  //
  // currentAction = current live chart state
  //
  // Example:
  //
  // setupType:
  //   PULLBACK_SETUP
  //
  // currentAction:
  //   wait_pullback
  //
  // Later:
  //
  // currentAction:
  //   enter_now
  // ===================================================

  let setupType = null;

  if (
    chartEntry.action === "wait_breakout" ||
    chartEntry.setupType === "breakout_long"
  ) {
    setupType = "BREAKOUT_SETUP";
  }

  else if (
    chartEntry.action === "wait_pullback" ||
    chartEntry.setupType === "pullback_long"
  ) {
    setupType = "PULLBACK_SETUP";
  }

  // ===================================================
  // NON-MONITORABLE SETUP
  //
  // avoid / no_setup should not create an active watch.
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
    chartEntry?.confidence ??
    forecast?.confidence ??
    forecast?.forecastScore ??
    0;

  // ===================================================
  // CREATE WATCH
  // ===================================================

  const watch = await ChartWatch.create({

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
    // Store the actual current chart action here.
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
    // AI METRICS
    // =================================================

    forecastScore:
      forecast?.forecastScore ??
      null,

    lastConfidence:
      confidence,

    // =================================================
    // ANALYSIS SNAPSHOT
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

  console.log(
    "👁️ LIVE CHART WATCH CREATED:",
    {
      watchId: watch._id,
      walletAddress,
      mintAddress: token.mintAddress,
      setupType: watch.setupType,
      currentAction: watch.currentAction,
    }
  );

  return watch;
}

// =====================================================
// USER ACTIVE WATCHES
// =====================================================

export async function getActiveChartWatches(
  walletAddress
) {
  if (!walletAddress) {
    return [];
  }

  return ChartWatch.find({
    walletAddress,
    status: "ACTIVE",
  })
    .sort({
      createdAt: -1,
    })
    .lean();
}

// =====================================================
// ALL ACTIVE WATCHES
// Used by the monitoring worker
// =====================================================

export async function getAllActiveChartWatches() {
  return ChartWatch.find({
    status: "ACTIVE",
  });
}

// =====================================================
// REFRESH ANALYSIS
// =====================================================

export async function refreshAnalysis(
  watch,
  chartEntry,
  forecast = null
) {
  if (!watch) {
    throw new Error("Chart watch is required");
  }

  if (!chartEntry?.action) {
    throw new Error("Invalid chart analysis");
  }

  // ===================================================
  // ACTION HISTORY
  // ===================================================

  watch.previousAction =
    watch.currentAction;

  watch.currentAction =
    chartEntry.action;

  // ===================================================
  // TREND
  // ===================================================

  watch.trend =
    chartEntry?.metrics?.trend ??
    watch.trend;

  // ===================================================
  // CONFIDENCE
  // ===================================================

  watch.confidence =
    chartEntry?.metrics?.confidence ??
    chartEntry?.confidence ??
    watch.confidence;

  // ===================================================
  // ENTRY LEVELS
  // ===================================================

  watch.entryMin =
    chartEntry?.metrics?.entryMin ??
    watch.entryMin;

  watch.entryMax =
    chartEntry?.metrics?.entryMax ??
    watch.entryMax;

  watch.breakoutLevel =
    chartEntry?.metrics?.breakoutLevel ??
    watch.breakoutLevel;

  watch.invalidationLevel =
    chartEntry?.metrics?.invalidationLevel ??
    watch.invalidationLevel;

  watch.takeProfitLevel =
    chartEntry?.metrics?.takeProfitLevel ??
    watch.takeProfitLevel;

  // ===================================================
  // FORECAST
  // ===================================================

  if (
    Number.isFinite(
      forecast?.forecastScore
    )
  ) {
    watch.forecastScore =
      forecast.forecastScore;
  }

  if (
    Number.isFinite(
      forecast?.confidence
    )
  ) {
    watch.lastConfidence =
      forecast.confidence;
  }

  // ===================================================
  // SNAPSHOT
  // ===================================================

  watch.analysisSnapshot = {
    ...(watch.analysisSnapshot || {}),
    chartEntry,
    forecast,
  };

  await watch.save();

  return watch;
}

// =====================================================
// UPDATE MONITOR DATA
// =====================================================

export async function touchWatch(
  watch,
  currentPrice
) {
  if (!watch) {
    throw new Error("Chart watch is required");
  }

  // ===================================================
  // PRICE
  // ===================================================

  if (
    Number.isFinite(currentPrice)
  ) {
    watch.lastPrice =
      currentPrice;

    if (
      watch.highestPriceSeen == null ||
      currentPrice >
        watch.highestPriceSeen
    ) {
      watch.highestPriceSeen =
        currentPrice;
    }

    if (
      watch.lowestPriceSeen == null ||
      currentPrice <
        watch.lowestPriceSeen
    ) {
      watch.lowestPriceSeen =
        currentPrice;
    }
  }

  // ===================================================
  // MONITOR COUNT
  // ===================================================

  watch.monitorCount =
    (watch.monitorCount || 0) + 1;

  watch.lastCheckedAt =
    new Date();

  await watch.save();

  return watch;
}

// =====================================================
// COMPLETE WATCH
// =====================================================

export async function completeWatch(
  watch,
  result,
  reason = null
) {
  if (!watch) {
    throw new Error("Chart watch is required");
  }

  watch.status =
    result;

  switch (result) {

    case "BUY_NOW":
      watch.finalResult =
        "BUY_TRIGGERED";
      break;

    case "INVALIDATED":
      watch.finalResult =
        "INVALIDATED";
      break;

    case "STOPPED":
      watch.finalResult =
        "STOPPED";
      break;

    case "EXPIRED":
      watch.finalResult =
        "EXPIRED";
      break;

    default:
      watch.finalResult =
        null;
  }

  watch.completedAt =
    new Date();

  watch.lastReason =
    reason;

  await watch.save();

  return watch;
}

// =====================================================
// STOP WATCH
// =====================================================

export async function stopChartWatch(
  watchId
) {
  const watch =
    await ChartWatch.findById(
      watchId
    );

  if (!watch) {
    return null;
  }

  return completeWatch(
    watch,
    "STOPPED",
    "Monitoring manually stopped."
  );
}

// =====================================================
// DELETE EXPIRED WATCHES
// =====================================================

export async function purgeExpiredChartWatches() {
  return ChartWatch.deleteMany({
    expiresAt: {
      $lte: new Date(),
    },
  });
}