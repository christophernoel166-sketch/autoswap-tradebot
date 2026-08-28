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
// UPDATE AN EXISTING WATCH USING AN ALREADY-COMPUTED
// CHART ANALYSIS
// =====================================================

export async function monitorExistingAnalysis(
  watchOrId,
  latestAnalysis
) {
  const watch =
    typeof watchOrId === "string"
      ? await ChartWatch.findById(watchOrId)
      : watchOrId;

  if (!watch) {
    throw new Error("Chart watch not found.");
  }

  if (watch.status !== "ACTIVE") {
    return {
      changed: false,
      skipped: true,
      reason: "Watch is not active.",
    };
  }

  // ===================================================
  // ANALYSIS UNAVAILABLE
  // ===================================================

  if (!latestAnalysis?.ok) {
    watch.lastCheckedAt = new Date();

    await watch.save();

    return {
      changed: false,
      skipped: true,
      reason: "Chart analysis unavailable.",
    };
  }

  // ===================================================
  // ACTION TRACKING
  // ===================================================

  const previousAction =
    watch.currentAction ?? null;

  const currentAction =
    latestAnalysis.action ?? null;

  const changed =
    previousAction !== currentAction;

  // ===================================================
  // DETERMINE EVENT
  // ===================================================

  const event =
    determineMonitorEvent(
      previousAction,
      currentAction
    );

  // ===================================================
  // MOVE CURRENT ACTION → PREVIOUS ACTION
  // THEN STORE NEW ACTION
  // ===================================================

  if (changed) {

    watch.previousAction =
      previousAction;

    watch.currentAction =
      currentAction;

  }

  // ===================================================
  // REFRESH CHART DATA
  // ===================================================

  watch.trend =
    latestAnalysis?.metrics?.trend ??
    watch.trend;

  watch.confidence =
    latestAnalysis?.metrics?.confidence ??
    watch.confidence;

  watch.entryMin =
    latestAnalysis?.metrics?.entryMin ??
    watch.entryMin;

  watch.entryMax =
    latestAnalysis?.metrics?.entryMax ??
    watch.entryMax;

  watch.breakoutLevel =
    latestAnalysis?.metrics?.breakoutLevel ??
    watch.breakoutLevel;

  watch.invalidationLevel =
    latestAnalysis?.metrics?.invalidationLevel ??
    watch.invalidationLevel;

  watch.takeProfitLevel =
    latestAnalysis?.metrics?.takeProfitLevel ??
    watch.takeProfitLevel;

  // ===================================================
  // STORE COMPLETE ANALYSIS SNAPSHOT
  // ===================================================

  watch.analysisSnapshot = {
    ...(watch.analysisSnapshot || {}),
    chartEntry: latestAnalysis,
  };

  // ===================================================
  // MONITOR DATA
  // ===================================================

  watch.lastCheckedAt =
    new Date();

  watch.monitorCount =
    (watch.monitorCount || 0) + 1;

  // ===================================================
  // UPDATE LAST EVENT
  // ===================================================

  if (changed && event) {

    watch.lastEvent =
      event;

    watch.lastEventAt =
      new Date();

  }

  // ===================================================
  // COMPLETE WATCH WHEN ENTRY IS CONFIRMED
  // ===================================================

  if (
    currentAction === "enter_now"
  ) {

    watch.status =
      "BUY_NOW";

    watch.finalResult =
      "BUY_TRIGGERED";

    watch.completedAt =
      new Date();

    watch.lastReason =
      "Chart analysis confirmed entry conditions.";

  }

  // ===================================================
  // INVALIDATE WATCH
  // ===================================================

  else if (
    currentAction === "avoid"
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
  // SAVE
  // ===================================================

  await watch.save();

  return {
    changed,
    event,
    previousAction,
    currentAction,
    analysis: latestAnalysis,
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
      ? await ChartWatch.findById(watchOrId)
      : watchOrId;

  if (!watch) {
    throw new Error("Chart watch not found.");
  }

  if (watch.status !== "ACTIVE") {
    return {
      changed: false,
      skipped: true,
      reason: "Watch is not active.",
    };
  }

  const latestAnalysis =
    await analyzeChartEntry(
      watch.mintAddress
    );

  return monitorExistingAnalysis(
    watch,
    latestAnalysis
  );
}