import ChartWatch from "../../models/ChartWatch.js";

import {
  monitorExistingAnalysis,
} from "../services/chartMonitorService.js";

import {
  analyzeChartEntry,
} from "../services/chartEntryService.js";
import {
  notifyChartWatch,
} from "../services/chartWatchNotificationService.js";

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

       if (result.changed) {

  LOG.info(
    `📈 ${watch.tokenSymbol || tokenMint}: ${result.previousAction} → ${result.currentAction}`
  );

  // ============================================
  // Dashboard Notification
  // ============================================

  try {

    await notifyChartWatch(
      watch,
      result
    );

  } catch (err) {

    LOG.error(
      `Failed to notify user for watch ${watch._id}:`,
      err.message
    );

  }

  // ============================================
  // Future Integrations
  // ============================================
  // Telegram Notification
  // Auto Trade Trigger

}

    LOG.error(
      `Failed to notify user for watch ${watch._id}:`,
      err.message
    );

  }

  // ===================================================
  // NEXT STEPS
  // ===================================================
  // Telegram Notification
  // Auto Trade Trigger

}

          // ===================================================
          // NEXT STEP:
          // Dashboard Notification
          // Telegram Notification
          // Auto Trade Trigger
          // ===================================================

        }

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
    return;
  }

  workerRunning = true;

  LOG.info(
    "🚀 Chart Watch Worker started."
  );

  // Run immediately once
  processCycle().catch((err) => {
    LOG.error(err);
  });

  // Continue every 30 seconds
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