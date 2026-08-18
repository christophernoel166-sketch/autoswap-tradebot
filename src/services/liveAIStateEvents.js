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
// DIAGNOSTIC VERSION
//
// IMPORTANT:
// This version DOES NOT change the confidence calculation.
// It only logs every possible confidence source so we
// can determine exactly where the value is coming from.
//
// =====================================================

export function publishLiveAIState(
  walletAddress,
  aiContext
) {

  if (!walletAddress || !aiContext) {
    console.warn(
      "⚠️ [LIVE AI STATE] publishLiveAIState() called without required data",
      {
        walletAddress,
        hasAIContext: !!aiContext,
      }
    );

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
  // BASIC DIAGNOSTIC
  // ===================================================

  console.log(
    "\n\n============================================================"
  );

  console.log(
    "🔬 [CONFIDENCE DIAGNOSTIC] publishLiveAIState() CALLED"
  );

  console.log(
    "============================================================"
  );

  console.dir(
    {
      walletAddress,

      mint:
        aiContext.mint ??
        aiContext.token?.mint ??
        null,

      recommendationObject:
        aiContext.recommendation ?? null,

      tradeDecisionObject:
        tradeDecision,

      protectionObject:
        protection,

      contextConfidence:
        aiContext.confidence ?? null,

      positionHealth:
        positionHealth,

      pipeline:
        pipeline,

      tradePlan:
        tradePlan,

      exitDecision:
        exitDecision,
    },
    {
      depth: null,
      colors: true,
    }
  );

  // ===================================================
  // CONFIDENCE SOURCES
  //
  // THESE ARE THE FOUR VALUES WE NEED TO TRACE.
  // ===================================================

  const recommendationConfidence =
    aiContext.recommendation?.confidence;

  const tradeDecisionConfidence =
    tradeDecision.confidence;

  const protectionConfidence =
    protection.confidence;

  const overallConfidence =
    aiContext.confidence?.overall;

  // ===================================================
  // CONFIDENCE DIAGNOSTIC
  // ===================================================

  console.log(
    "\n============================================================"
  );

  console.log(
    "🔬 [CONFIDENCE DIAGNOSTIC] ALL CONFIDENCE SOURCES"
  );

  console.log(
    "============================================================"
  );

  console.dir(
    {
      walletAddress,

      mint:
        aiContext.mint ??
        aiContext.token?.mint ??
        null,

      "1️⃣ recommendation.confidence":
        recommendationConfidence,

      "2️⃣ tradeDecision.confidence":
        tradeDecisionConfidence,

      "3️⃣ protection.confidence":
        protectionConfidence,

      "4️⃣ aiContext.confidence.overall":
        overallConfidence,

    },
    {
      depth: null,
      colors: true,
    }
  );

  // ===================================================
  // DETERMINE WHICH SOURCE WILL WIN
  // ===================================================

  let selectedConfidenceSource =
    "DEFAULT_0";

  if (
    recommendationConfidence !==
      undefined &&
    recommendationConfidence !== null
  ) {

    selectedConfidenceSource =
      "recommendation.confidence";

  } else if (
    tradeDecisionConfidence !==
      undefined &&
    tradeDecisionConfidence !== null
  ) {

    selectedConfidenceSource =
      "tradeDecision.confidence";

  } else if (
    protectionConfidence !==
      undefined &&
    protectionConfidence !== null
  ) {

    selectedConfidenceSource =
      "protection.confidence";

  } else if (
    overallConfidence !==
      undefined &&
    overallConfidence !== null
  ) {

    selectedConfidenceSource =
      "aiContext.confidence.overall";

  }

  // ===================================================
  // EXISTING CONFIDENCE CALCULATION
  //
  // DO NOT CHANGE THIS YET.
  // ===================================================

  const confidence =
    Number(
      aiContext.recommendation?.confidence ??
      tradeDecision.confidence ??
      protection.confidence ??
      aiContext.confidence?.overall ??
      0
    );

  // ===================================================
  // FINAL CONFIDENCE DIAGNOSTIC
  // ===================================================

  console.log(
    "\n============================================================"
  );

  console.log(
    "🎯 [CONFIDENCE DIAGNOSTIC] FINAL RESULT"
  );

  console.log(
    "============================================================"
  );

  console.dir(
    {
      walletAddress,

      mint:
        aiContext.mint ??
        aiContext.token?.mint ??
        null,

      selectedConfidenceSource,

      finalConfidence:
        confidence,

      finalConfidenceType:
        typeof confidence,

      recommendationConfidence,
      tradeDecisionConfidence,
      protectionConfidence,
      overallConfidence,

    },
    {
      depth: null,
      colors: true,
    }
  );

  console.log(
    "============================================================\n"
  );

  // ===================================================
  // Normalize other values
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

  if (
    pipeline.status === "COMPLETED"
  ) {

    progress = 100;

  }

  // ===================================================
  // PUBLISH TO AI STATE SERVICE
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
  // ACTIVITY FEED
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
  // FINAL STATE DIAGNOSTIC
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

      // ===============================================
      // IMPORTANT DIAGNOSTIC VALUES
      // ===============================================

      confidenceSource:
        selectedConfidenceSource,

      recommendationConfidence,

      tradeDecisionConfidence,

      protectionConfidence,

      overallConfidence,

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