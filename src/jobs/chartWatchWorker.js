import ChartWatch from "../../models/ChartWatch.js";



import {
  analyzeChartEntry,
} from "../services/chartEntryService.js";

import {
  dispatchChartNotification,
} from "../services/chartNotificationDispatcher.js";

const LOG = console;

const CHECK_INTERVAL_MS = 30000;

let workerRunning = false;

// =====================================================
// PROCESS ONE CYCLE
// =====================================================

async function processCycle() {

  const watches = await ChartWatch.find({
    status: "ACTIVE",
  }).lean(false);

  LOG.info(
    `📊 Monitoring ${watches.length} active chart watches`
  );

  if (!watches.length) {
    return;
  }

  // =====================================================
  // GROUP WATCHES BY TOKEN
  // =====================================================

  const grouped = new Map();

  for (const watch of watches) {

    const mint = watch.tokenMint;

    if (!grouped.has(mint)) {
      grouped.set(mint, []);
    }

    grouped.get(mint).push(watch);

  }

  LOG.info(
    `🪙 ${grouped.size} unique tokens to analyze`
  );

  // =====================================================
  // ANALYZE EACH TOKEN ONLY ONCE
  // =====================================================

  for (const [
    tokenMint,
    tokenWatches,
  ] of grouped.entries()) {

    let latestAnalysis;

    try {

      latestAnalysis =
        await analyzeChartEntry(
          tokenMint
        );

    } catch (err) {

      LOG.error(
        `❌ Failed to analyze ${tokenMint}:`,
        err.message
      );

      continue;

    }

    // ===================================================
    // UPDATE EVERY WATCH USING SAME ANALYSIS
    // ===================================================

    for (const watch of tokenWatches) {

      try {

        const result =
          await monitorExistingAnalysis(
            watch,
            latestAnalysis
          );

        // ================================================
        // DID THE SIGNAL CHANGE?
        // ================================================

        if (!result.changed) {
          continue;
        }

        LOG.info(
          `📈 ${watch.tokenSymbol || tokenMint}: ${result.previousAction} → ${result.currentAction}`
        );

        // ================================================
        // DASHBOARD NOTIFICATION
        // ================================================

        try {

  await dispatchChartNotification({
    watch,
    result,
  });

} catch (err) {

  LOG.error(
    `❌ Failed to dispatch notifications for watch ${watch._id}:`,
    err.message
  );

}

        // ================================================
        // FUTURE INTEGRATIONS
        // ================================================

        // TODO:
        // sendTelegramChartAlert(watch, result);

        // TODO:
        // triggerAutoTrade(watch, result);

      } catch (err) {

        LOG.error(
          `❌ Failed updating watch ${watch._id}:`,
          err.message
        );

      }

    }

  }

}

// =====================================================
// START WORKER
// =====================================================

export function startChartWatchWorker() {

  if (workerRunning) {

    LOG.info(
      "⚠️ Chart Watch Worker already running."
    );

    return;

  }

  workerRunning = true;

  LOG.info(
    "🚀 Chart Watch Worker started."
  );

  // ================================================
  // Run immediately
  // ================================================

  processCycle().catch((err) => {

    LOG.error(
      "Chart Watch Worker:",
      err
    );

  });

  // ================================================
  // Continue every 30 seconds
  // ================================================

  setInterval(async () => {

    try {

      await processCycle();

    } catch (err) {

      LOG.error(
        "Chart Watch Worker:",
        err
      );

    }

  }, CHECK_INTERVAL_MS);

}