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

const LOG = console;

// =====================================================
// CONFIGURATION
// =====================================================

const CHECK_INTERVAL_MS = 30000;

let workerRunning = false;
let cycleRunning = false;

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
    // Multiple users may be watching the same token.
    // Analyze that token only once per cycle.
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

        LOG.info(
          `📈 Chart analysis completed for ${tokenMint}`,
          {
            action:
              latestAnalysis?.action ??
              null,

            confidence:
              latestAnalysis?.confidence ??
              0,

            score:
              latestAnalysis?.score ??
              0,

            setupType:
              latestAnalysis?.setupType ??
              null,
          }
        );

      } catch (err) {

        LOG.error(
          `❌ Failed to analyze ${tokenMint}:`,
          err?.message ||
            err
        );

        // Do not break the entire worker.
        // Continue with the next token.
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
          // NO ACTION CHANGE
          //
          // The watch was still monitored and its
          // latest analysis was stored, but there is
          // no new event to notify about.
          // =========================================

          if (
            !result?.changed
          ) {

            LOG.info(
              `⏳ ${watch.symbol || tokenMint}: ${result.currentAction || "no action change"}`
            );

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
          // DISPATCH DASHBOARD / OTHER NOTIFICATIONS
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