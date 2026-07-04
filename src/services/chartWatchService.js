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
  const existing = await ChartWatch.findOne({
    walletAddress,
    mintAddress: token.mintAddress,
    status: "ACTIVE",
  });

  if (existing) {
    return existing;
  }

  const currentPrice =
    chartEntry?.metrics?.currentPrice ??
    token?.priceUsd ??
    null;

  const confidence =
    chartEntry?.metrics?.confidence ??
    forecast?.confidence ??
    forecast?.forecastScore ??
    0;

  return ChartWatch.create({
    // Token
    mintAddress: token.mintAddress,
    pairAddress: token.pairAddress,
    symbol: token.symbol,
    name: token.name,

    // User
    walletAddress,

    // Setup
    setupType: chartEntry.action,

    currentAction: chartEntry.action,
    previousAction: null,

    trend:
      chartEntry?.metrics?.trend ?? null,

    confidence,

    // Entry Levels
    entryMin:
      chartEntry?.metrics?.entryMin ?? null,

    entryMax:
      chartEntry?.metrics?.entryMax ?? null,

    breakoutLevel:
      chartEntry?.metrics?.breakoutLevel ??
      null,

    invalidationLevel:
      chartEntry?.metrics?.invalidationLevel ??
      null,

    takeProfitLevel:
      chartEntry?.metrics?.takeProfitLevel ??
      null,

    // Prices
    initialPrice: currentPrice,
    lastPrice: currentPrice,
    highestPriceSeen: currentPrice,
    lowestPriceSeen: currentPrice,

    // AI
    forecastScore:
      forecast?.forecastScore ?? null,

    lastConfidence: confidence,

    analysisSnapshot: {
      token,
      chartEntry,
      forecast,
    },

    autoTrade,
  });
}

// =====================================================
// USER ACTIVE WATCHES
// =====================================================

export async function getActiveChartWatches(
  walletAddress
) {
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
// ALL ACTIVE WATCHES (Worker)
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
  watch.previousAction =
    watch.currentAction;

  watch.currentAction =
    chartEntry.action;

  watch.trend =
    chartEntry?.metrics?.trend ??
    watch.trend;

  watch.confidence =
    chartEntry?.metrics?.confidence ??
    watch.confidence;

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
    chartEntry?.metrics
      ?.invalidationLevel ??
    watch.invalidationLevel;

  watch.takeProfitLevel =
    chartEntry?.metrics
      ?.takeProfitLevel ??
    watch.takeProfitLevel;

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
  if (
    Number.isFinite(currentPrice)
  ) {
    watch.lastPrice = currentPrice;

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

  watch.monitorCount += 1;

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
  watch.status = result;

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
      watch.finalResult = null;
  }

  watch.completedAt =
    new Date();

  watch.lastReason = reason;

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
    "STOPPED"
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