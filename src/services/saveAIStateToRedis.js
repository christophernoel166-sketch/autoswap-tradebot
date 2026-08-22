import { redis } from "../utils/redis.js";
import { positionKey } from "../redis/positionKeys.js";

import {
    updateAnalysis,
} from "./aiStateService.js";

import {
    resolveAIConfidence,
} from "./resolveAIConfidence.js";

/**
 * ==========================================================
 * SAVE AI STATE TO REDIS
 * ==========================================================
 *
 * Responsibilities
 * ----------------
 * ✔ Restore AI memory from Redis
 * ✔ Resolve ONE authoritative AI confidence
 * ✔ Synchronize wallet-level AI state
 * ✔ Build AI timeline snapshots
 * ✔ Persist AI state to position Redis
 * ✔ Preserve AI evolution memory
 * ✔ Preserve individual confidence components
 * ✔ Provide diagnostics for confidence resolution
 *
 * ==========================================================
 *
 * AUTHORITATIVE CONFIDENCE
 * ------------------------
 *
 * ALL live AI confidence must come from:
 *
 *     resolveAIConfidence(context)
 *
 * Priority:
 *
 * 1. tradeDecision.confidence
 * 2. exitDecision.confidence
 * 3. recommendation.confidence
 * 4. protection.confidence
 * 5. aiContext.confidence.overall
 * 6. 0
 *
 * A confidence value of 0 is treated as unavailable by
 * resolveAIConfidence().
 *
 * IMPORTANT
 * ---------
 *
 * protection.confidence is NOT the general AI confidence.
 *
 * Example:
 *
 *     tradeDecision.confidence = 67
 *     exitDecision.confidence  = 67
 *     protection.confidence    = 60
 *
 * Result:
 *
 *     aiConfidence = 67
 *
 * While:
 *
 *     aiProtectionConfidence = 60
 *
 * ==========================================================
 */

export async function saveAIStateToRedis(context) {

    // ======================================================
    // VALIDATION
    // ======================================================

    if (
        !context?.walletAddress ||
        !context?.mint
    ) {
        console.warn(
            "⚠️ [AI REDIS] Missing walletAddress or mint"
        );

        return;
    }

    // ======================================================
    // EXTRACT AI OBJECTS
    // ======================================================

    const positionHealth =
        context.positionHealth || {};

    const protection =
        context.protectionStrategy || {};

    const tradeDecision =
        context.tradeDecision || {};

    const tradePlan =
        context.tradePlan || {};

    const exitDecision =
        context.exitDecision || {};

    const pipeline =
        context.pipeline || {};

    // ======================================================
    // AI EVOLUTION MEMORY
    // ======================================================

    let aiMemory =
        context.aiMemory || {};

    // ======================================================
    // RESTORE EXISTING MEMORY FROM REDIS
    // ======================================================

    try {

        const existing =
            await redis.hget(
                positionKey(
                    context.walletAddress,
                    context.mint
                ),
                "aiMemory"
            );

        if (existing) {

            try {

                const parsedMemory =
                    JSON.parse(existing);

                aiMemory = {

                    ...parsedMemory,

                    ...aiMemory,

                };

            } catch (parseError) {

                console.warn(
                    "⚠️ [AI REDIS] Failed to parse existing AI memory:",
                    parseError?.message ||
                    parseError
                );

            }

        }

    } catch (err) {

        console.warn(
            "⚠️ [AI REDIS] Failed to restore AI memory:",
            err?.message ||
            err
        );

    }

    // ======================================================
    // AUTHORITATIVE AI CONFIDENCE
    // ======================================================
    //
    // DO NOT calculate confidence locally.
    //
    // This MUST use the same resolver used by the live
    // AI state system.
    //
    // ======================================================

    const resolvedConfidence =
        resolveAIConfidence(
            context
        );

    const aiConfidence =
        Number(
            resolvedConfidence?.confidence ?? 0
        );

    const selectedConfidenceSource =
        resolvedConfidence?.source ||
        "DEFAULT_0";

    // ======================================================
    // INDIVIDUAL CONFIDENCE COMPONENTS
    // ======================================================

    const recommendationConfidence =
        context
            ?.recommendation
            ?.confidence ??
        null;

    const tradeDecisionConfidence =
        tradeDecision
            ?.confidence ??
        null;

    const exitDecisionConfidence =
        exitDecision
            ?.confidence ??
        null;

    const protectionConfidence =
        protection
            ?.confidence ??
        null;

    const overallConfidence =
        context
            ?.confidence
            ?.overall ??
        null;

    // ======================================================
    // AI RECOMMENDATION
    // ======================================================

    const aiRecommendation =
        tradeDecision
            ?.recommendation ??
        context
            ?.recommendation
            ?.recommendation ??
        context
            ?.recommendation
            ?.action ??
        exitDecision
            ?.recommendation ??
        exitDecision
            ?.action ??
        null;

    // ======================================================
    // AI ACTION
    // ======================================================

    const aiAction =
        tradePlan
            ?.action ??
        tradeDecision
            ?.action ??
        exitDecision
            ?.action ??
        null;

    // ======================================================
    // CONFIDENCE TREND
    // ======================================================

    const confidenceTrend =
        aiMemory?.confidenceTrend ??
        (
            aiConfidence >= 80
                ? "RISING"
                : aiConfidence >= 50
                    ? "STABLE"
                    : "FALLING"
        );

    // ======================================================
    // SYNCHRONIZE WALLET-LEVEL AI STATE
    // ======================================================
    //
    // This is the same authoritative confidence that will
    // be stored in the position Redis record.
    //
    // ======================================================

    updateAnalysis(
        context.walletAddress,
        {

            recommendation:
                aiRecommendation,

            confidence:
                aiConfidence,

            signalScore:
                context
                    ?.analyses
                    ?.signalScore ??
                context
                    ?.signalScore ??
                null,

            confidenceTrend:
                confidenceTrend,

        }
    );

    // ======================================================
    // CONFIDENCE DIAGNOSTIC
    // ======================================================

    console.log(
        "\n============================================================"
    );

    console.log(
        "🎯 [AI REDIS] AUTHORITATIVE CONFIDENCE"
    );

    console.log(
        "============================================================"
    );

    console.dir(
        {

            walletAddress:
                context.walletAddress,

            mint:
                context.mint,

            // ------------------------------------------
            // FINAL AUTHORITY
            // ------------------------------------------

            finalConfidence:
                aiConfidence,

            selectedConfidenceSource:
                selectedConfidenceSource,

            // ------------------------------------------
            // INPUT COMPONENTS
            // ------------------------------------------

            tradeDecisionConfidence:
                tradeDecisionConfidence,

            exitDecisionConfidence:
                exitDecisionConfidence,

            recommendationConfidence:
                recommendationConfidence,

            protectionConfidence:
                protectionConfidence,

            overallConfidence:
                overallConfidence,

            // ------------------------------------------
            // DECISION
            // ------------------------------------------

            recommendation:
                aiRecommendation,

            action:
                aiAction,

        },
        {
            depth: null,
            colors: true,
        }
    );

    console.log(
        "============================================================\n"
    );

    // ======================================================
    // SOCKET STATE SYNCHRONIZATION LOG
    // ======================================================

    console.log(
        "🧠 AI SOCKET STATE SYNCHRONIZED",
        {

            walletAddress:
                context.walletAddress,

            mint:
                context.mint,

            confidence:
                aiConfidence,

            confidenceSource:
                selectedConfidenceSource,

            recommendation:
                aiRecommendation,

            action:
                aiAction,

            // IMPORTANT:
            // These remain separate from general AI confidence.

            protectionConfidence:
                Number(
                    protectionConfidence ?? 0
                ),

            exitDecisionConfidence:
                Number(
                    exitDecisionConfidence ?? 0
                ),

        }
    );

    // ======================================================
    // BUILD AI SNAPSHOT
    // ======================================================
    //
    // The timeline stores the AUTHORITATIVE AI confidence.
    //
    // Protection confidence and exit confidence are stored
    // separately so historical analysis can distinguish them.
    //
    // ======================================================

    const snapshot = {

        timestamp:
            new Date().toISOString(),

        // ------------------------------------------
        // Position health
        // ------------------------------------------

        health:
            positionHealth
                ?.overallHealth ||
            null,

        trend:
            positionHealth
                ?.trend ||
            null,

        // ------------------------------------------
        // AUTHORITATIVE AI CONFIDENCE
        // ------------------------------------------

        confidence:
            aiConfidence,

        confidenceSource:
            selectedConfidenceSource,

        // ------------------------------------------
        // COMPONENT CONFIDENCES
        // ------------------------------------------

        protectionConfidence:
            protectionConfidence,

        exitDecisionConfidence:
            exitDecisionConfidence,

        // ------------------------------------------
        // Protection
        // ------------------------------------------

        protection:
            protection
                ?.protectionLevel ||
            null,

        // ------------------------------------------
        // Decision
        // ------------------------------------------

        recommendation:
            aiRecommendation ||
            null,

        action:
            aiAction,

        // ------------------------------------------
        // Position metrics
        // ------------------------------------------

        pnl:
            context
                ?.changePercent ??
            null,

        highestPrice:
            context
                ?.highestPrice ??
            null,

    };

    // ======================================================
    // UPDATE AI TIMELINE
    // ======================================================

    const timeline =
        Array.isArray(
            aiMemory?.timeline
        )
            ? [
                ...aiMemory.timeline,
            ]
            : [];

    timeline.push(
        snapshot
    );

    // ======================================================
    // KEEP ONLY LATEST 20 OBSERVATIONS
    // ======================================================

    if (
        timeline.length > 20
    ) {

        timeline.splice(
            0,
            timeline.length - 20
        );

    }

    aiMemory.timeline =
        timeline;

    aiMemory.lastSnapshot =
        snapshot;

    aiMemory.lastUpdated =
        new Date();

    // Keep confidence trend available to the next cycle.

    aiMemory.confidenceTrend =
        confidenceTrend;

    // ======================================================
    // SAVE AI STATE TO POSITION REDIS
    // ======================================================

    const key =
        positionKey(
            context.walletAddress,
            context.mint
        );

    await redis.hset(
        key,
        {

            // ==================================================
            // PIPELINE
            // ==================================================

            aiStatus:
                pipeline
                    ?.status ||
                "",

            aiStage:
                pipeline
                    ?.stage ||
                "",

            // ==================================================
            // POSITION HEALTH
            // ==================================================

            aiHealth:
                positionHealth
                    ?.overallHealth ||
                "",

            aiTrend:
                positionHealth
                    ?.trend ||
                "",

            // ==================================================
            // PROTECTION
            // ==================================================

            aiProtection:
                protection
                    ?.protectionLevel ||
                "",

            aiTask:
                protection
                    ?.protectionIntent ||
                "",

            // ==================================================
            // AUTHORITATIVE AI CONFIDENCE
            // ==================================================
            //
            // IMPORTANT:
            //
            // This MUST be aiConfidence.
            //
            // NEVER replace this with:
            //
            // protection.confidence
            //
            // because protection confidence is a different
            // metric.
            //
            // ==================================================

            aiConfidence:
                String(
                    aiConfidence
                ),

            aiConfidenceSource:
                selectedConfidenceSource,

            // ==================================================
            // INDIVIDUAL CONFIDENCE COMPONENTS
            // ==================================================

            aiRecommendationConfidence:
                String(
                    recommendationConfidence ??
                    0
                ),

            aiTradeDecisionConfidence:
                String(
                    tradeDecisionConfidence ??
                    0
                ),

            aiExitDecisionConfidence:
                String(
                    exitDecisionConfidence ??
                    0
                ),

            aiProtectionConfidence:
                String(
                    protectionConfidence ??
                    0
                ),

            aiOverallConfidence:
                String(
                    overallConfidence ??
                    0
                ),

            // ==================================================
            // DECISION
            // ==================================================

            aiRecommendation:
                aiRecommendation ||
                "",

            aiAction:
                aiAction ||
                "",

            // ==================================================
            // EXIT DECISION
            // ==================================================

            aiExitDecision:
                exitDecision
                    ?.decision ??
                exitDecision
                    ?.action ??
                "",

            // ==================================================
            // FULL AI OBJECTS
            // ==================================================

            aiPipeline:
                JSON.stringify(
                    pipeline
                ),

            aiPositionHealth:
                JSON.stringify(
                    positionHealth
                ),

            aiProtectionStrategy:
                JSON.stringify(
                    protection
                ),

            aiTradeDecision:
                JSON.stringify(
                    tradeDecision
                ),

            aiTradePlan:
                JSON.stringify(
                    tradePlan
                ),

            aiExitDecisionObject:
                JSON.stringify(
                    exitDecision
                ),

            // ==================================================
            // AI MEMORY
            // ==================================================

            aiMemory:
                JSON.stringify(
                    aiMemory
                ),

        }
    );

    // ======================================================
    // VERIFY REDIS WRITE
    // ======================================================

    const saved =
        await redis.hgetall(
            key
        );

    // ======================================================
    // FINAL REDIS STATE DIAGNOSTIC
    // ======================================================

    console.log(
        "\n================ AI REDIS STATE ================\n"
    );

    console.dir(
        {

            key:

                key,

            // ------------------------------------------
            // Pipeline
            // ------------------------------------------

            aiStatus:
                saved
                    ?.aiStatus,

            aiStage:
                saved
                    ?.aiStage,

            // ------------------------------------------
            // Health
            // ------------------------------------------

            aiHealth:
                saved
                    ?.aiHealth,

            aiTrend:
                saved
                    ?.aiTrend,

            // ------------------------------------------
            // Protection
            // ------------------------------------------

            aiProtection:
                saved
                    ?.aiProtection,

            aiTask:
                saved
                    ?.aiTask,

            // ------------------------------------------
            // AUTHORITATIVE CONFIDENCE
            // ------------------------------------------

            aiConfidence:
                saved
                    ?.aiConfidence,

            aiConfidenceSource:
                saved
                    ?.aiConfidenceSource,

            // ------------------------------------------
            // CONFIDENCE COMPONENTS
            // ------------------------------------------

            aiRecommendationConfidence:
                saved
                    ?.aiRecommendationConfidence,

            aiTradeDecisionConfidence:
                saved
                    ?.aiTradeDecisionConfidence,

            aiExitDecisionConfidence:
                saved
                    ?.aiExitDecisionConfidence,

            aiProtectionConfidence:
                saved
                    ?.aiProtectionConfidence,

            aiOverallConfidence:
                saved
                    ?.aiOverallConfidence,

            // ------------------------------------------
            // Decision
            // ------------------------------------------

            aiRecommendation:
                saved
                    ?.aiRecommendation,

            aiAction:
                saved
                    ?.aiAction,

            aiExitDecision:
                saved
                    ?.aiExitDecision,

        },
        {
            depth: null,
            colors: true,
        }
    );

    console.log(
        "\n================================================\n"
    );

    // ======================================================
    // FINAL CONSISTENCY CHECK
    // ======================================================

    const redisConfidence =
        Number(
            saved
                ?.aiConfidence ??
            0
        );

    if (
        redisConfidence !==
        aiConfidence
    ) {

        console.error(
            "🚨 [AI REDIS] CONFIDENCE MISMATCH",
            {

                expected:
                    aiConfidence,

                actual:
                    redisConfidence,

                source:
                    selectedConfidenceSource,

                walletAddress:
                    context.walletAddress,

                mint:
                    context.mint,

            }
        );

    } else {

        console.log(
            "✅ [AI REDIS] CONFIDENCE VERIFIED",
            {

                confidence:
                    redisConfidence,

                source:
                    selectedConfidenceSource,

            }
        );

    }

}

// ==========================================================
// DEFAULT EXPORT
// ==========================================================

export default {
    saveAIStateToRedis,
};