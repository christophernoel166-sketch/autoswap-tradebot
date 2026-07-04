// =====================================================
// SERIALIZE SINGLE WATCH
// =====================================================

export function serializeChartWatch(watch) {
  if (!watch) {
    return null;
  }

  return {
    id: watch._id.toString(),

    // =====================================================
    // TOKEN
    // =====================================================

    mintAddress: watch.mintAddress,
    pairAddress: watch.pairAddress,

    symbol: watch.symbol,
    name: watch.name,

    // =====================================================
    // USER
    // =====================================================

    walletAddress: watch.walletAddress,

    // =====================================================
    // STATUS
    // =====================================================

    status: watch.status,
    setupType: watch.setupType,

    currentAction: watch.currentAction,
    previousAction: watch.previousAction,

    // =====================================================
    // TREND
    // =====================================================

    trend: watch.trend,

    confidence: watch.confidence,

    forecastScore: watch.forecastScore,

    // =====================================================
    // ENTRY LEVELS
    // =====================================================

    entryMin: watch.entryMin,
    entryMax: watch.entryMax,

    breakoutLevel: watch.breakoutLevel,

    invalidationLevel:
      watch.invalidationLevel,

    takeProfitLevel:
      watch.takeProfitLevel,

    // =====================================================
    // PRICE
    // =====================================================

    initialPrice: watch.initialPrice,

    currentPrice: watch.lastPrice,

    highestPriceSeen:
      watch.highestPriceSeen,

    lowestPriceSeen:
      watch.lowestPriceSeen,

    // =====================================================
    // MONITORING
    // =====================================================

    monitorCount:
      watch.monitorCount,

    lastCheckedAt:
      watch.lastCheckedAt,

    startedMonitoringAt:
      watch.startedMonitoringAt,

    expiresAt:
      watch.expiresAt,

    // =====================================================
    // RESULT
    // =====================================================

    finalResult:
      watch.finalResult,

    completedAt:
      watch.completedAt,

    lastReason:
      watch.lastReason,

    // =====================================================
    // FLAGS
    // =====================================================

    autoTrade:
      watch.autoTrade,

    dashboardNotified:
      watch.dashboardNotified,

    telegramNotified:
      watch.telegramNotified,

    // =====================================================
    // TIMESTAMPS
    // =====================================================

    createdAt:
      watch.createdAt,

    updatedAt:
      watch.updatedAt,
  };
}

// =====================================================
// SERIALIZE ARRAY
// =====================================================

export function serializeChartWatchList(
  watches = []
) {
  return watches.map(
    serializeChartWatch
  );
}