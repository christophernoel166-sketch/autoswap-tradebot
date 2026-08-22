// src/services/liveAIStateEvents.js

import {
  updateMultiple,
  addActivity,
} from "./aiStateService.js";

import {
  resolveAIConfidence,
} from "./resolveAIConfidence.js";

// =====================================================
// PUBLISH LIVE POSITION AI STATE
// =====================================================
//
// Converts the completed live-position AI context into
// the existing frontend AI state structure.
//
// IMPORTANT:
// The FINAL trade decision has priority over the
// preliminary RecommendationEngine result.
//
// Confidence is resolved through ONE shared resolver:
//     resolveAIConfidence()
//
// This prevents different AI state persistence paths
// from calculating different confidence values.
//
// =====================================================

export function publishLiveAIState(
  walletAddress,
  aiContext
) {

  if (
    !walletAddress ||
    !aiContext
  ) {

    console.warn(
      "⚠️ [LIVE AI STATE] publishLiveAIState() called without required data",
      {
        walletAddress,
        hasAIContext:
          !!aiContext,
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
  // CONFIDENCE RESOLUTION
  // ===================================================
  //
  // ONE authoritative resolver.
  //
  // Example:
  //
  // tradeDecision.confidence = 0
  // exitDecision.confidence = 67
  //
  // Result:
  //
  // confidence = 67
  //
  // ===================================================

  const {
    confidence,
    source:
      selectedConfidenceSource,
  } =
    resolveAIConfidence(
      aiContext
    );

  // ===================================================
  // BASIC DIAGNOSTIC
  // ===================================================

  console.log(
    "\n\n============================================================"
  );

  console.log(
    "🧠 [LIVE AI STATE] publishLiveAIState() CALLED"
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
        aiContext.recommendation ??
        null,

      tradeDecisionObject:
        tradeDecision,

      exitDecisionObject:
        exitDecision,

      protectionObject:
        protection,

      contextConfidence:
        aiContext.confidence ??
        null,

      pipeline,

      tradePlan,
    },
    {
      depth: null,
      colors: true,
    }
  );

  // ===================================================
  // CONFIDENCE SOURCE DIAGNOSTIC
  // ===================================================

  console.log(
    "\n============================================================"
  );

  console.log(
    "🎯 [CONFIDENCE RESOLVER] FINAL RESULT"
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

      recommendationConfidence:
        aiContext
          .recommendation
          ?.confidence ??
        null,

      tradeDecisionConfidence:
        tradeDecision
          .confidence ??
        null,

      exitDecisionConfidence:
        exitDecision
          .confidence ??
        null,

      protectionConfidence:
        protection
          .confidence ??
        null,

      overallConfidence:
        aiContext
          .confidence
          ?.overall ??
        null,
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
    positionHealth
      .overallHealth ??
    "UNKNOWN";

  const trend =
    positionHealth
      .trend ??
    "UNKNOWN";

  const protectionLevel =
    protection
      .protectionLevel ??
    "NONE";

  const protectionIntent =
    protection
      .protectionIntent ??
    "Monitoring position";

  // ===================================================
  // FINAL RECOMMENDATION
  // ===================================================
  //
  // Prefer the final trade decision because it represents
  // the coordinated AI decision.
  //
  // For an open position, exitDecision remains available
  // as the fallback recommendation.
  //
  // ===================================================

  const recommendation =
    tradeDecision
      .recommendation ??
    aiContext
      .recommendation
      ?.recommendation ??
    aiContext
      .recommendation
      ?.action ??
    exitDecision
      .recommendation ??
    exitDecision
      .action ??
    "HOLD";

  // ===================================================
  // FINAL ACTION
  // ===================================================

  const action =
    tradePlan.action ??
    tradeDecision.action ??
    exitDecision.action ??
    "HOLD";

  // ===================================================
  // Determine live AI status
  // ===================================================

  let status =
    "MONITORING";

  if (
    pipeline.status ===
    "FAILED"
  ) {

    status =
      "ERROR";

  } else if (
    pipeline.status ===
    "COMPLETED"
  ) {

    status =
      "MONITORING";

  } else if (
    pipeline.status ===
    "RUNNING"
  ) {

    status =
      "ANALYZING";
  }

  // ===================================================
  // Current AI task
  // ===================================================

  let currentTask =
    protectionIntent;

  if (
    action ===
    "FULL_EXIT"
  ) {

    currentTask =
      "FULL_EXIT";

  } else if (
    action ===
      "PARTIAL_EXIT" ||
    action ===
      "SCALE_OUT"
  ) {

    currentTask =
      action;

  } else if (
    pipeline.stage
  ) {

    currentTask =
      pipeline.stage;
  }

  // ===================================================
  // Protection representation
  // ===================================================

  const protectedValue =
    protectionLevel &&
    protectionLevel !==
      "NONE"
      ? 1
      : 0;

  // ===================================================
  // Pipeline progress
  // ===================================================

  let progress =
    Number(
      pipeline.progress ??
      0
    );

  if (
    !Number.isFinite(
      progress
    )
  ) {

    progress =
      0;
  }

  if (
    pipeline.status ===
    "COMPLETED"
  ) {

    progress =
      100;
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

          reviewing:
            1,

          protected:
            protectedValue,

          healthy:
            health ===
            "HEALTHY"
              ? 1
              : 0,

          warning:
            health ===
            "WARNING"
              ? 1
              : 0,

          danger:
            health ===
            "CRITICAL"
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
              selectedConfidenceSource,

            exitDecision:
              exitDecision
                .decision ??
              exitDecision
                .action ??
              null,

            exitDecisionConfidence:
              exitDecision
                .confidence ??
              null,

            tradeDecisionConfidence:
              tradeDecision
                .confidence ??
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
      // CONFIDENCE
      // ===============================================

      confidenceSource:
        selectedConfidenceSource,

      recommendationConfidence:
        aiContext
          .recommendation
          ?.confidence ??
        null,

      tradeDecisionConfidence:
        tradeDecision
          .confidence ??
        null,

      exitDecisionConfidence:
        exitDecision
          .confidence ??
        null,

      protectionConfidence:
        protection
          .confidence ??
        null,

      overallConfidence:
        aiContext
          .confidence
          ?.overall ??
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