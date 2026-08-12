// src/services/liveAIStateEvents.js

import {
  updateMultiple,
  addActivity,
} from "./aiStateService.js";

// =====================================================
// PUBLISH LIVE POSITION AI STATE
// =====================================================
//
// Converts the completed live-position AI context into
// the existing frontend AI state structure.
//
// This function:
//   ✔ Publishes live AI status
//   ✔ Publishes position health
//   ✔ Publishes AI confidence
//   ✔ Publishes recommendation
//   ✔ Publishes trend
//   ✔ Publishes protection information
//   ✔ Publishes current trade-management action
//
// This function NEVER:
//   ✘ Executes trades
//   ✘ Modifies blockchain
//   ✘ Makes AI decisions
//   ✘ Reads/writes Redis directly
//
// aiStateService handles the Socket.IO emission.
// =====================================================

export function publishLiveAIState(
  walletAddress,
  aiContext
) {
  if (!walletAddress || !aiContext) {
    return null;
  }

  // ===================================================
  // Extract AI outputs
  // ===================================================

  const positionHealth =
    aiContext.positionHealth || {};

  const protection =
    aiContext.protectionStrategy || {};

  const tradeDecision =
    aiContext.tradeDecision || {};

  const tradePlan =
    aiContext.tradePlan || {};

  const exitDecision =
    aiContext.exitDecision || {};

  const pipeline =
    aiContext.pipeline || {};

  // ===================================================
  // Normalize values
  // ===================================================

  const health =
    positionHealth.overallHealth ??
    "UNKNOWN";

  const trend =
    positionHealth.trend ??
    "UNKNOWN";

  const protectionLevel =
    protection.protectionLevel ??
    "NONE";

  const protectionIntent =
    protection.protectionIntent ??
    "Monitoring position";

 const recommendation =
    aiContext.recommendation?.recommendation ??
    aiContext.recommendation?.action ??
    tradeDecision.recommendation ??
    "HOLD";

const confidence =
    Number(
        aiContext.recommendation?.confidence ??
        tradeDecision.confidence ??
        protection.confidence ??
        aiContext.confidence?.overall ??
        0
    );

  const action =
    tradePlan.action ??
    exitDecision.action ??
    "HOLD";

  // ===================================================
  // Determine live AI status
  // ===================================================

  let status = "MONITORING";

  if (pipeline.status === "FAILED") {
    status = "ERROR";
  } else if (pipeline.status === "COMPLETED") {
    status = "MONITORING";
  } else if (pipeline.status === "RUNNING") {
    status = "ANALYZING";
  }

  // ===================================================
  // Current AI task
  // ===================================================

  let currentTask =
    protectionIntent;

  if (action === "FULL_EXIT") {
    currentTask = "FULL_EXIT";
  } else if (
    action === "PARTIAL_EXIT" ||
    action === "SCALE_OUT"
  ) {
    currentTask = action;
  } else if (pipeline.stage) {
    currentTask = pipeline.stage;
  }

  // ===================================================
  // Protection representation
  //
  // Frontend portfolio.protected is numeric.
  //
  // We therefore DO NOT place:
  //
  //   "MODERATE"
  //
  // into that field.
  //
  // Instead:
  //   1 = protected position
  //   0 = not protected
  // ===================================================

  const protectedValue =
    protectionLevel &&
    protectionLevel !== "NONE"
      ? 1
      : 0;

  // ===================================================
  // Pipeline progress
  // ===================================================

  let progress =
    Number(
      pipeline.progress ?? 0
    );

  if (
    !Number.isFinite(progress)
  ) {
    progress = 0;
  }

  // Completed live AI cycle
  if (
    pipeline.status === "COMPLETED"
  ) {
    progress = 100;
  }

  // ===================================================
  // Publish to existing AI state service
  //
  // updateMultiple() automatically:
  //
  //   update in memory
  //        ↓
  //   emit individual events
  //        ↓
  //   emit complete "ai_state"
  // ===================================================

  const state =
    updateMultiple(
      walletAddress,
      {

        // =============================================
        // SYSTEM
        // =============================================

        system: {

          status,

          health,

          currentTask,

        },


        // =============================================
        // PORTFOLIO
        // =============================================

        portfolio: {

          confidence,

          health,

          protected:
            protectedValue,

        },


        // =============================================
        // MARKET
        // =============================================

        market: {

          trend,

        },


        // =============================================
        // PIPELINE
        // =============================================

        pipeline: {

          active:
            pipeline.status !==
            "COMPLETED",

          stage:
            pipeline.stage ??
            "LIVE_MONITOR",

          progress,

          token:
            aiContext.mint ??
            aiContext.token?.mint ??
            null,

          startedAt:
            pipeline.startedAt ??
            null,

        },


        // =============================================
        // POSITIONS
        // =============================================

        positions: {

          reviewing: 1,

          protected:
            protectedValue,

          healthy:
            health === "HEALTHY"
              ? 1
              : 0,

          warning:
            health === "WARNING"
              ? 1
              : 0,

          danger:
            health === "CRITICAL"
              ? 1
              : 0,

        },


        // =============================================
        // ANALYSIS
        // =============================================

        analysis: {

          recommendation,

          confidence,

         evidence: {

    health,

    trend,

    protection:
        protectionLevel,

    recommendationSource:
        aiContext.recommendation
            ? "RecommendationEngine"
            : "TradeDecisionCoordinator",

    exitDecision:
        exitDecision.decision ??
        exitDecision.action ??
        null,

    action,

},

          reasoning: {

            health,

            trend,

            protection:
              protectionLevel,

            recommendation,

            action,

          },

          confidenceTrend:
            confidence >= 80
              ? "RISING"
              : confidence >= 50
              ? "STABLE"
              : "FALLING",

        },


        // =============================================
        // DIAGNOSTICS
        // =============================================

        diagnostics: {

          redisStatus:
            "HEALTHY",

        },

      }
    );

  // ===================================================
  // Activity feed
  // ===================================================

  addActivity(
    walletAddress,
    {

      type:
        "LIVE_AI_UPDATE",

      title:
        "Live AI position analysis",

      description:
        `${recommendation} → ${action}`,

      confidence,

      health,

      trend,

      protection:
        protectionLevel,

    }
  );

  // ===================================================
  // Debug
  // ===================================================

  console.log(
    "\n================ LIVE AI STATE PUBLISHED ================\n"
  );

  console.dir(
    {

      walletAddress,

      status,

      health,

      trend,

      protection:
        protectionLevel,

      confidence,

      recommendation,

      action,

      currentTask,

      mint:
        aiContext.mint ??
        aiContext.token?.mint ??
        null,

    },
    {
      depth: null,
      colors: true,
    }
  );

  console.log(
    "\n==========================================================\n"
  );

  return state;
}

export default {
  publishLiveAIState,
};