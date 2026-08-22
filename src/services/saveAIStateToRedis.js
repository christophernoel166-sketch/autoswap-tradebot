import { redis } from "../utils/redis.js";
import { positionKey } from "../redis/positionKeys.js";

import {
    updateAnalysis,
} from "./aiStateService.js";



// ==========================================================
// SAVE AI STATE TO REDIS
// ==========================================================
//
// Responsibilities
// ----------------
// ✔ Restore AI memory from Redis
// ✔ Resolve authoritative AI confidence
// ✔ Synchronize wallet-level AI state
// ✔ Build AI timeline snapshots
// ✔ Persist AI state to position Redis
// ✔ Preserve AI evolution memory
// ✔ Provide diagnostics for confidence resolution
//
// Confidence authority
// --------------------
// Uses the SAME resolver as liveAIStateEvents.js:
//
//     resolveAIConfidence()
//
// Priority:
//
// 1. tradeDecision.confidence
// 2. exitDecision.confidence
// 3. recommendation.confidence
// 4. protection.confidence
// 5. aiContext.confidence.overall
// 6. 0
//
// IMPORTANT
// ---------
// A confidence value of 0 is treated as unavailable.
//
// This prevents:
//
//     tradeDecision.confidence = 0
//
// from incorrectly overriding:
//
//     exitDecision.confidence = 67
//
// ==========================================================


export async function saveAIStateToRedis(
    context
) {

    // ======================================================
    // VALIDATION
    // ======================================================

    if (
        !context?.walletAddress ||
        !context?.mint
    ) {

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

                aiMemory = {

                    ...JSON.parse(
                        existing
                    ),

                    ...aiMemory,

                };

            } catch (parseError) {

                console.warn(
                    "⚠️ Failed to parse existing AI memory:",
                    parseError?.message ||
                    parseError
                );

            }

        }

    } catch (err) {

        console.warn(
            "⚠️ Failed to restore AI memory:",
            err?.message ||
            err
        );

    }


    // ======================================================
    // AUTHORITATIVE AI CONFIDENCE
    // ======================================================
    //
    // IMPORTANT:
    //
    // Do NOT calculate confidence locally here.
    //
    // Both:
    //
    //     liveAIStateEvents.js
    //
    // and:
    //
    //     saveAIStateToRedis.js
    //
    // MUST use the same resolver.
    //
    // ======================================================

    const {

        confidence:
            aiConfidence,

        source:
            selectedConfidenceSource,

    } =
        resolveAIConfidence(
            context
        );


    // ======================================================
    // CONFIDENCE SOURCE VALUES
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
    // SYNCHRONIZE WALLET-LEVEL AI STATE
    // ======================================================
    //
    // This confidence is now guaranteed to match the
    // confidence selected by liveAIStateEvents.js.
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
                aiMemory
                    ?.confidenceTrend ??
                (
                    aiConfidence >= 80
                        ? "RISING"
                        : aiConfidence >= 50
                            ? "STABLE"
                            : "FALLING"
                ),

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

            selectedConfidenceSource,

            finalConfidence:
                aiConfidence,

            recommendationConfidence,

            tradeDecisionConfidence,

            exitDecisionConfidence,

            protectionConfidence,

            overallConfidence,

            recommendation:
                aiRecommendation,

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
    // AI SOCKET STATE SYNCHRONIZATION LOG
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

            protectionConfidence:
                Number(
                    protection
                        ?.confidence ??
                    0
                ),

            exitDecisionConfidence:
                Number(
                    exitDecision
                        ?.confidence ??
                    0
                ),

        }
    );


    // ======================================================
    // BUILD AI SNAPSHOT
    // ======================================================
    //
    // The timeline now stores the AUTHORITATIVE AI
    // confidence rather than protection confidence.
    //
    // This is important because timeline analysis should
    // represent the actual AI decision confidence.
    //
    // ======================================================

    const snapshot = {

        timestamp:
            new Date().toISOString(),

        health:
            positionHealth
                .overallHealth ||
            null,

        trend:
            positionHealth
                .trend ||
            null,

        confidence:
            aiConfidence,

        confidenceSource:
            selectedConfidenceSource,

        protectionConfidence:
            protection
                .confidence ??
            null,

        exitDecisionConfidence:
            exitDecision
                .confidence ??
            null,

        protection:
            protection
                .protectionLevel ||
            null,

        recommendation:
            aiRecommendation ||
            null,

        action:
            tradePlan
                .action ||
            tradeDecision
                .action ||
            exitDecision
                .action ||
            null,

        pnl:
            context.changePercent ??
            null,

        highestPrice:
            context.highestPrice ??
            null,

    };


    // ======================================================
    // UPDATE AI TIMELINE
    // ======================================================

    const timeline =
        Array.isArray(
            aiMemory.timeline
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


    // ======================================================
    // SAVE AI STATE TO POSITION REDIS
    // ======================================================

    await redis.hset(
        positionKey(
            context.walletAddress,
            context.mint
        ),
        {

            // ==================================================
            // PIPELINE
            // ==================================================

            aiStatus:
                pipeline
                    .status ||
                "",

            aiStage:
                pipeline
                    .stage ||
                "",


            // ==================================================
            // POSITION
            // ==================================================

            aiHealth:
                positionHealth
                    .overallHealth ||
                "",

            aiTrend:
                positionHealth
                    .trend ||
                "",


            // ==================================================
            // PROTECTION
            // ==================================================

            aiProtection:
                protection
                    .protectionLevel ||
                "",

            aiTask:
                protection
                    .protectionIntent ||
                "",

            // IMPORTANT:
            //
            // aiConfidence now means the AUTHORITATIVE
            // AI confidence.
            //
            // It is NO LONGER protection.confidence.

            aiConfidence:
                String(
                    aiConfidence
                ),

            aiConfidenceSource:
                selectedConfidenceSource,


            // ==================================================
            // CONFIDENCE COMPONENTS
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
                tradePlan
                    .action ||
                tradeDecision
                    .action ||
                exitDecision
                    .action ||
                "",


            // ==================================================
            // EXIT DECISION
            // ==================================================

            aiExitDecision:
                exitDecision
                    .decision ??
                exitDecision
                    .action ??
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
    // DEBUG - VERIFY REDIS WRITE
    // ======================================================

    const saved =
        await redis.hgetall(
            positionKey(
                context.walletAddress,
                context.mint
            )
        );


    // ======================================================
    // FINAL REDIS STATE DIAGNOSTIC
    // ======================================================

    console.log(
        "\n================ AI REDIS STATE ================\n"
    );


    console.dir(
        {

            aiStatus:
                saved.aiStatus,

            aiStage:
                saved.aiStage,

            aiHealth:
                saved.aiHealth,

            aiTrend:
                saved.aiTrend,

            aiProtection:
                saved.aiProtection,

            aiTask:
                saved.aiTask,

            // ==========================================
            // AUTHORITATIVE CONFIDENCE
            // ==========================================

            aiConfidence:
                saved.aiConfidence,

            aiConfidenceSource:
                saved.aiConfidenceSource,

            // ==========================================
            // CONFIDENCE COMPONENTS
            // ==========================================

            aiRecommendationConfidence:
                saved.aiRecommendationConfidence,

            aiTradeDecisionConfidence:
                saved.aiTradeDecisionConfidence,

            aiExitDecisionConfidence:
                saved.aiExitDecisionConfidence,

            aiProtectionConfidence:
                saved.aiProtectionConfidence,

            aiOverallConfidence:
                saved.aiOverallConfidence,

            // ==========================================
            // DECISION
            // ==========================================

            aiRecommendation:
                saved.aiRecommendation,

            aiAction:
                saved.aiAction,

            aiExitDecision:
                saved.aiExitDecision,

        },
        {
            depth: null,
            colors: true,
        }
    );


    console.log(
        "\n===============================================\n"
    );

}


export default {
    saveAIStateToRedis,
};