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

  if (!latestAnalysis?.ok) {
    watch.lastCheckedAt = new Date();

    await watch.save();

    return {
      changed: false,
      skipped: true,
      reason: "Chart analysis unavailable.",
    };
  }

  const previousAction =
    watch.chartEntry?.action ?? null;

  const currentAction =
    latestAnalysis.action ?? null;

  const changed =
    previousAction !== currentAction;

  const event =
    determineMonitorEvent(
      previousAction,
      currentAction
    );

  watch.chartEntry = latestAnalysis;

  watch.lastCheckedAt = new Date();

  if (changed) {
    watch.lastEvent = event;
    watch.lastEventAt = new Date();
  }

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
      watch.tokenMint
    );

  return monitorExistingAnalysis(
    watch,
    latestAnalysis
  );
}