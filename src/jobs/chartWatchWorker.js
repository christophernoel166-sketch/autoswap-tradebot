import ChartWatch from "../../models/ChartWatch.js";

import {
  monitorExistingAnalysis,
} from "../services/chartMonitorService.js";

import {
  analyzeChartEntry,
} from "../services/chartEntryService.js";

import {
  dispatchChartNotification,
} from "../services/chartNotificationDispatcher.js";

import {
  emitToRoom,
} from "../services/socketService.js";

import {
  serializeChartWatch,
} from "../services/chartWatchSerializer.js";

const LOG = console;

// =====================================================
// CONFIGURATION
// =====================================================

const CHECK_INTERVAL_MS = 30000;

let workerRunning = false;
let cycleRunning = false;

// =====================================================
// EMIT LIVE CHART WATCH UPDATE
// =====================================================
//
// This sends the latest analysis to the user's private
// Socket.IO wallet room.
//
// IMPORTANT:
// This happens EVERY successful monitoring cycle,
// even when the action has not changed.
//
// That allows the frontend card to remain truly live.
// =====================================================

function emitLiveChartWatchUpdate(
  watch,
  result
) {

  if (!watch || !result) {
    return false;
  }

  const walletAddress =
    String(
      watch.walletAddress || ""
    ).trim();

  if (!walletAddress) {

    LOG.warn(
      `⚠️ Cannot emit chart watch update: watch ${watch._id} has no walletAddress`
    );

    return false;
  }

  const room =
    `wallet:${walletAddress}`;

  // ===================================================
  // SERIALIZE THE CURRENT WATCH
  // ===================================================

  const serializedWatch =
    serializeChartWatch(
      result.watch || watch
    );

  // ===================================================
  // LIVE PAYLOAD
  // ===================================================

  const payload = {

    watch:
      serializedWatch,

    // Latest complete chart analysis.
    analysis:
      result.analysis || null,

    // Action transition information.
    previousAction:
      result.previousAction || null,

    currentAction:
      result.currentAction || null,

    event:
      result.event || null,

    changed:
      Boolean(
        result.changed
      ),

    updatedAt:
      new Date(),

  };

  // ===================================================
  // EMIT TO USER WALLET ROOM
  // ===================================================

  const emitted =
    emitToRoom(
      room,
      "chart_watch_update",
      payload
    );

  if (emitted) {

    LOG.info(
      `📡 Live chart update sent: ${watch.symbol || watch.mintAddress}`,
      {
        watchId:
          watch._id?.toString?.() ||
          watch._id,

        walletAddress,

        action:
          result.currentAction || null,

        changed:
          Boolean(result.changed),

        event:
          result.event || null,
      }
    );

  }

  return emitted;
}

// =====================================================
// PROCESS ONE MONITORING CYCLE
// =====================================================

async function processCycle() {

  // ===================================================
  // PREVENT OVERLAPPING CYCLES
  // ===================================================

  if (cycleRunning) {

    LOG.warn(
      "⚠️ Chart Watch Worker: previous cycle still running. Skipping this cycle."
    );

    return;
  }

  cycleRunning = true;

  try {

    // =================================================
    // LOAD ACTIVE WATCHES
    // =================================================

    const watches =
      await ChartWatch.find({
        status: "ACTIVE",
      }).lean(false);

    LOG.info(
      `📊 Monitoring ${watches.length} active chart watches`
    );

    if (!watches.length) {
      return;
    }

    // =================================================
    // GROUP WATCHES BY TOKEN
    //
    // Multiple users can watch the same token.
    // Analyze each token only once per cycle.
    // =================================================

    const grouped =
      new Map();

    for (const watch of watches) {

      const mint =
        String(
          watch.mintAddress || ""
        ).trim();

      if (!mint) {

        LOG.warn(
          `⚠️ Chart watch ${watch._id} has no mintAddress`
        );

        continue;
      }

      if (!grouped.has(mint)) {

        grouped.set(
          mint,
          []
        );

      }

      grouped
        .get(mint)
        .push(watch);

    }

    LOG.info(
      `🪙 ${grouped.size} unique tokens to analyze`
    );

    // =================================================
    // ANALYZE EACH TOKEN
    // =================================================

    for (
      const [
        tokenMint,
        tokenWatches,
      ] of grouped.entries()
    ) {

      let latestAnalysis;

      // ===============================================
      // RUN FRESH CHART ANALYSIS
      // ===============================================

      try {

        latestAnalysis =
          await analyzeChartEntry(
            tokenMint
          );

      } catch (err) {

        LOG.error(
          `❌ Failed to analyze ${tokenMint}:`,
          err?.message ||
            err
        );

        continue;
      }

      // ===============================================
      // INVALID ANALYSIS
      // ===============================================

      if (
        !latestAnalysis?.ok
      ) {

        LOG.warn(
          `⚠️ Chart analysis unavailable for ${tokenMint}`
        );

        continue;
      }

      // ===============================================
      // UPDATE EVERY WATCH FOR THIS TOKEN
      // ===============================================

      for (
        const watch of tokenWatches
      ) {

        try {

          const result =
            await monitorExistingAnalysis(
              watch,
              latestAnalysis
            );

          // =========================================
          // SEND LIVE UPDATE EVERY CYCLE
          //
          // IMPORTANT:
          // We do NOT put this behind result.changed.
          //
          // The frontend needs fresh price, RSI,
          // EMA, entry zone, confidence, etc.
          // even while the action remains unchanged.
          // =========================================

          emitLiveChartWatchUpdate(
            watch,
            result
          );

          // =========================================
          // NO ACTION CHANGE
          //
          // We already sent the live update above.
          // We simply don't send a new notification.
          // =========================================

          if (
            !result?.changed
          ) {

            continue;
          }

          // =========================================
          // ACTION CHANGED
          // =========================================

          LOG.info(
            `📈 ${watch.symbol || tokenMint}: ${result.previousAction || "none"} → ${result.currentAction || "none"}`,
            {
              event:
                result.event ||
                null,

              watchId:
                watch._id?.toString?.() ||
                watch._id,
            }
          );

          // =========================================
          // DASHBOARD / TELEGRAM NOTIFICATIONS
          //
          // These are separate from the live Socket.IO
          // update above.
          // =========================================

          if (
            result.event
          ) {

            try {

              await dispatchChartNotification({
                watch,
                result,
              });

            } catch (err) {

              LOG.error(
                `❌ Failed to dispatch notifications for watch ${watch._id}:`,
                err?.message ||
                  err
              );

            }

          }

          // =========================================
          // FUTURE AUTO-TRADE INTEGRATION
          // =========================================

          /*
          if (
            result.currentAction ===
              "enter_now" &&
            watch.autoTrade &&
            !watch.autoTradeExecuted
          ) {

            // Future:
            // triggerAutoTrade(watch, result);

          }
          */

        } catch (err) {

          LOG.error(
            `❌ Failed updating watch ${watch._id}:`,
            err?.message ||
              err
          );

        }

      }

    }

  } finally {

    cycleRunning = false;

  }

}

// =====================================================
// START WORKER
// =====================================================

export function startChartWatchWorker() {

  // ===================================================
  // PREVENT MULTIPLE WORKERS
  // ===================================================

  if (
    workerRunning
  ) {

    LOG.info(
      "⚠️ Chart Watch Worker already running."
    );

    return;

  }

  workerRunning = true;

  LOG.info(
    "🚀 Chart Watch Worker started."
  );

  LOG.info(
    `⏱️ Chart Watch Worker interval: ${CHECK_INTERVAL_MS / 1000}s`
  );

  // ===================================================
  // RUN FIRST CYCLE IMMEDIATELY
  // ===================================================

  processCycle()
    .catch((err) => {

      LOG.error(
        "❌ Chart Watch Worker initial cycle failed:",
        err
      );

    });

  // ===================================================
  // CONTINUE EVERY 30 SECONDS
  // ===================================================

  setInterval(
    async () => {

      try {

        await processCycle();

      } catch (err) {

        LOG.error(
          "❌ Chart Watch Worker cycle failed:",
          err
        );

      }

    },
    CHECK_INTERVAL_MS
  );

}