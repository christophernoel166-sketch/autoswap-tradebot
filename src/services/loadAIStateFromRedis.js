import { redis } from "../utils/redis.js";
import { positionKey } from "../redis/positionKeys.js";

// ==========================================
// Safe JSON Parser
// ==========================================

function safeParse(value, fallback = null) {

    if (!value) {
        return fallback;
    }

    try {

        return JSON.parse(value);

    } catch (err) {

        console.warn(
            "Failed to parse AI state:",
            err.message
        );

        return fallback;

    }

}

export async function loadAIStateFromRedis(
    walletAddress,
    mint
) {

    if (!walletAddress || !mint) {
        return null;
    }

    const saved = await redis.hgetall(
        positionKey(
            walletAddress,
            mint
        )
    );

    if (
        !saved ||
        Object.keys(saved).length === 0
    ) {
        return null;
    }

    const state = {

        // ======================================
        // Pipeline
        // ======================================

        pipeline:
            safeParse(saved.aiPipeline),

        // ======================================
        // Position Intelligence
        // ======================================

        positionHealth:
            safeParse(saved.aiPositionHealth),

        // ======================================
        // Protection Strategy
        // ======================================

        protectionStrategy:
            safeParse(saved.aiProtectionStrategy),

        // ======================================
        // Trade Decision
        // ======================================

        tradeDecision:
            safeParse(saved.aiTradeDecision),

        // ======================================
        // Trade Plan
        // ======================================

        tradePlan:
            safeParse(saved.aiTradePlan),

        // ======================================
        // AI Evolution Memory
        // ======================================

        aiMemory:
            safeParse(saved.aiMemory, {
                timeline: [],
                lastSnapshot: null,
                lastUpdated: null,
                version: 1,
            }),

        // ======================================
        // Live Dashboard Fields
        // ======================================

        aiStatus:
            saved.aiStatus || "IDLE",

        aiStage:
            saved.aiStage || "WAITING",

        aiHealth:
            saved.aiHealth || "UNKNOWN",

        aiTrend:
            saved.aiTrend || "UNKNOWN",

        aiProtection:
            saved.aiProtection || "NONE",

        aiTask:
            saved.aiTask || "Monitoring",

        aiConfidence:
            Number(saved.aiConfidence || 0),

       aiRecommendation:
    saved.aiRecommendation || null,

aiAction:
    saved.aiAction || null,

    };

    // ==========================================
    // DEBUG
    // ==========================================

    console.log(
        "\n================ AI MEMORY LOADED ================\n"
    );

    console.dir(
        {
            walletAddress,
            mint,
            timelineLength:
                state.aiMemory.timeline.length,
            lastSnapshot:
                state.aiMemory.lastSnapshot,
            aiStatus:
                state.aiStatus,
            aiHealth:
                state.aiHealth,
            aiRecommendation:
                state.aiRecommendation,
            aiAction:
                state.aiAction,
        },
        {
            depth: null,
            colors: true,
        }
    );

    console.log(
        "\n==================================================\n"
    );

    return state;

}

export default {

    loadAIStateFromRedis,

};