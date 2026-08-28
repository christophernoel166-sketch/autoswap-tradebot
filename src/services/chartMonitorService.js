import ChartWatch from "../../models/ChartWatch.js";
import { analyzeChartEntry } from "./chartEntryService.js";

// =====================================================
// DETERMINE WHAT CHANGED
// =====================================================

export function determineMonitorEvent(
  previousAction,
  currentAction
) {
  if (
    previousAction === "wait_breakout" &&
    currentAction === "enter_now"
  ) {
    return "BREAKOUT_CONFIRMED";
  }

  if (
    previousAction === "wait_pullback" &&
    currentAction === "enter_now"
  ) {
    return "PULLBACK_COMPLETED";
  }

  if (
    previousAction === "enter_now" &&
    currentAction === "avoid"
  ) {
    return "SETUP_INVALIDATED";
  }

  if (
    previousAction === "wait_breakout" &&
    currentAction === "avoid"
  ) {
    return "BREAKOUT_FAILED";
  }

  if (
    previousAction === "wait_pullback" &&
    currentAction === "avoid"
  ) {
    return "PULLBACK_FAILED";
  }

  return null;
}

// =====================================================
// UPDATE PRICE TRACKING
// =====================================================

function updatePriceTracking(
  watch,
  currentPrice
) {
  if (!Number.isFinite(currentPrice)) {
    return;
  }

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

// =====================================================
// UPDATE AN EXISTING WATCH USING AN ALREADY-COMPUTED
// CHART ANALYSIS
// =====================================================

export async function monitorExistingAnalysis(
  watchOrId,
  latestAnalysis
) {
  const watch =
    typeof watchOrId === "string"
      ? await ChartWatch.findById(
          watchOrId
        )
      : watchOrId;

  if (!watch) {
    throw new Error(
      "Chart watch not found."
    );
  }

  // ===================================================
  // ONLY ACTIVE WATCHES ARE MONITORED
  // ===================================================

  if (
    watch.status !== "ACTIVE"
  ) {
    return {
      changed: false,
      skipped: true,
      reason:
        "Watch is not active.",
    };
  }

  // ===================================================
  // ANALYSIS UNAVAILABLE
  // ===================================================

  if (
    !latestAnalysis?.ok
  ) {
    watch.lastCheckedAt =
      new Date();

    watch.monitorCount =
      (watch.monitorCount || 0) +
      1;

    await watch.save();

    return {
      changed: false,
      skipped: true,
      reason:
        "Chart analysis unavailable.",
    };
  }

  // ===================================================
  // CURRENT PRICE
  // ===================================================

  const currentPrice =
    Number(
      latestAnalysis
        ?.metrics
        ?.currentPrice
    );

  // ===================================================
  // PREVIOUS ACTION
  //
  // IMPORTANT:
  // ChartWatch stores the current state directly
  // in currentAction.
  // ===================================================

  const previousAction =
    watch.currentAction ??
    null;

  // ===================================================
  // NEW ACTION
  // ===================================================

  const currentAction =
    latestAnalysis.action ??
    null;

  // ===================================================
  // DETERMINE WHETHER STATE CHANGED
  // ===================================================

  const changed =
    previousAction !==
    currentAction;

  // ===================================================
  // DETERMINE EVENT
  // ===================================================

  const event =
    determineMonitorEvent(
      previousAction,
      currentAction
    );

  // ===================================================
  // UPDATE ACTION STATE
  // ===================================================

  if (changed) {
    watch.previousAction =
      previousAction;

    watch.currentAction =
      currentAction;
  }

  // ===================================================
  // REFRESH TREND
  // ===================================================

  if (
    latestAnalysis
      ?.metrics
      ?.trend != null
  ) {
    watch.trend =
      latestAnalysis.metrics.trend;
  }

  // ===================================================
  // REFRESH CONFIDENCE
  // ===================================================

  if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.confidence
      )
    )
  ) {
    watch.confidence =
      Number(
        latestAnalysis.confidence
      );
  } else if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.metrics
          ?.confidence
      )
    )
  ) {
    watch.confidence =
      Number(
        latestAnalysis
          .metrics
          .confidence
      );
  }

  // ===================================================
  // REFRESH ENTRY MIN
  // ===================================================

  if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.metrics
          ?.entryMin
      )
    )
  ) {
    watch.entryMin =
      Number(
        latestAnalysis
          .metrics
          .entryMin
      );
  } else if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.entryZone
          ?.low
      )
    )
  ) {
    watch.entryMin =
      Number(
        latestAnalysis
          .entryZone
          .low
      );
  }

  // ===================================================
  // REFRESH ENTRY MAX
  // ===================================================

  if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.metrics
          ?.entryMax
      )
    )
  ) {
    watch.entryMax =
      Number(
        latestAnalysis
          .metrics
          .entryMax
      );
  } else if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.entryZone
          ?.high
      )
    )
  ) {
    watch.entryMax =
      Number(
        latestAnalysis
          .entryZone
          .high
      );
  }

  // ===================================================
  // REFRESH BREAKOUT LEVEL
  // ===================================================

  if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.metrics
          ?.breakoutLevel
      )
    )
  ) {
    watch.breakoutLevel =
      Number(
        latestAnalysis
          .metrics
          .breakoutLevel
      );
  }

  // ===================================================
  // REFRESH INVALIDATION LEVEL
  // ===================================================

  if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.metrics
          ?.invalidationLevel
      )
    )
  ) {
    watch.invalidationLevel =
      Number(
        latestAnalysis
          .metrics
          .invalidationLevel
      );
  } else if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.stopLoss
      )
    )
  ) {
    watch.invalidationLevel =
      Number(
        latestAnalysis.stopLoss
      );
  }

  // ===================================================
  // REFRESH TAKE PROFIT
  // ===================================================

  if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.metrics
          ?.takeProfitLevel
      )
    )
  ) {
    watch.takeProfitLevel =
      Number(
        latestAnalysis
          .metrics
          .takeProfitLevel
      );
  } else if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.targets
          ?.tp1
      )
    )
  ) {
    watch.takeProfitLevel =
      Number(
        latestAnalysis
          .targets
          .tp1
      );
  }

  // ===================================================
  // REFRESH FORECAST / CONFIDENCE
  // ===================================================

  if (
    Number.isFinite(
      Number(
        latestAnalysis
          ?.forecastScore
      )
    )
  ) {
    watch.forecastScore =
      Number(
        latestAnalysis
          .forecastScore
      );
  }

  // ===================================================
  // UPDATE LIVE PRICE TRACKING
  // ===================================================

  updatePriceTracking(
    watch,
    currentPrice
  );

  // ===================================================
  // MONITOR COUNT
  // ===================================================

  watch.monitorCount =
    (watch.monitorCount || 0) +
    1;

  // ===================================================
  // LAST CHECKED
  // ===================================================

  watch.lastCheckedAt =
    new Date();

  // ===================================================
  // STORE LATEST ANALYSIS
  //
  // Keep the most recent analysis available for
  // dashboard/details endpoints.
  // ===================================================

  watch.analysisSnapshot = {
    ...(watch.analysisSnapshot || {}),

    chartEntry:
      latestAnalysis,

    lastUpdatedAt:
      new Date(),
  };

  // ===================================================
  // EVENT INFORMATION
  // ===================================================

  if (
    changed &&
    event
  ) {
    watch.lastEvent =
      event;

    watch.lastEventAt =
      new Date();
  }

  // ===================================================
  // ENTRY CONFIRMED
  //
  // IMPORTANT:
  // Only transition when the action actually changed
  // into enter_now.
  //
  // This prevents repeatedly processing the same
  // ENTER_NOW state.
  // ===================================================

  if (
    changed &&
    currentAction ===
      "enter_now"
  ) {
    watch.status =
      "BUY_NOW";

    watch.finalResult =
      "BUY_TRIGGERED";

    watch.completedAt =
      new Date();

    watch.lastReason =
      event ===
      "PULLBACK_COMPLETED"
        ? "Pullback completed and chart conditions confirmed entry."
        : event ===
          "BREAKOUT_CONFIRMED"
        ? "Breakout confirmed and chart conditions confirmed entry."
        : "Chart analysis confirmed entry conditions.";
  }

  // ===================================================
  // INVALIDATED
  //
  // Only invalidate when the action actually changes
  // into avoid.
  // ===================================================

  else if (
    changed &&
    currentAction ===
      "avoid"
  ) {
    watch.status =
      "INVALIDATED";

    watch.finalResult =
      "INVALIDATED";

    watch.completedAt =
      new Date();

    watch.lastReason =
      "Chart analysis invalidated the setup.";
  }

  // ===================================================
  // SAVE WATCH
  // ===================================================

  await watch.save();

  // ===================================================
  // RETURN MONITOR RESULT
  // ===================================================

  return {
    changed,

    event,

    previousAction,

    currentAction,

    analysis:
      latestAnalysis,

    watch,
  };
}

// =====================================================
// MONITOR ONE WATCH
// (Convenience wrapper)
// =====================================================

export async function monitorChartWatch(
  watchOrId
) {
  const watch =
    typeof watchOrId === "string"
      ? await ChartWatch.findById(
          watchOrId
        )
      : watchOrId;

  if (!watch) {
    throw new Error(
      "Chart watch not found."
    );
  }

  if (
    watch.status !== "ACTIVE"
  ) {
    return {
      changed: false,
      skipped: true,
      reason:
        "Watch is not active.",
    };
  }

  // ===================================================
  // RUN FRESH CHART ANALYSIS
  // ===================================================

  const latestAnalysis =
    await analyzeChartEntry(
      watch.mintAddress
    );

  // ===================================================
  // APPLY NEW ANALYSIS
  // ===================================================

  return monitorExistingAnalysis(
    watch,
    latestAnalysis
  );
}