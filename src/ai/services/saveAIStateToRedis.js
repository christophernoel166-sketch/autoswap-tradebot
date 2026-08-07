import { redis } from "../utils/redis.js";
import { positionKey } from "../redis/positionKeys.js";

export async function saveAIStateToRedis(context) {

    if (!context?.walletAddress || !context?.mint) {
        return;
    }

    const positionHealth =
        context.positionHealth || {};

    const protection =
        context.protectionStrategy || {};

    const tradeDecision =
        context.tradeDecision || {};

    const tradePlan =
        context.tradePlan || {};

    const pipeline =
        context.pipeline || {};

    await redis.hset(
        positionKey(
            context.walletAddress,
            context.mint
        ),
        {

            // -----------------------------
            // Pipeline
            // -----------------------------

            aiStatus:
                pipeline.status || "",

            aiStage:
                pipeline.stage || "",

            // -----------------------------
            // Position
            // -----------------------------

            aiHealth:
                positionHealth.overallHealth || "",

            aiTrend:
                positionHealth.trend || "",

            // -----------------------------
            // Protection
            // -----------------------------

            aiProtection:
                protection.protectionLevel || "",

            aiTask:
                protection.protectionIntent || "",

            aiConfidence:
                String(
                    protection.confidence ?? 0
                ),

            // -----------------------------
            // Decision
            // -----------------------------

            aiRecommendation:
                tradeDecision.recommendation || "",

            aiAction:
                tradePlan.action || "",

            // -----------------------------
            // Full AI Objects
            // -----------------------------

            aiPipeline:
                JSON.stringify(pipeline),

            aiPositionHealth:
                JSON.stringify(positionHealth),

            aiProtectionStrategy:
                JSON.stringify(protection),

            aiTradeDecision:
                JSON.stringify(tradeDecision),

            aiTradePlan:
                JSON.stringify(tradePlan),

        }
    );

    // ==========================================
    // DEBUG - Verify Redis write
    // ==========================================

    const saved = await redis.hgetall(
        positionKey(
            context.walletAddress,
            context.mint
        )
    );

    console.log(
        "\n================ AI REDIS STATE ================\n"
    );

    console.dir(
        {
            aiStatus: saved.aiStatus,
            aiStage: saved.aiStage,
            aiHealth: saved.aiHealth,
            aiTrend: saved.aiTrend,
            aiProtection: saved.aiProtection,
            aiTask: saved.aiTask,
            aiConfidence: saved.aiConfidence,
            aiRecommendation: saved.aiRecommendation,
            aiAction: saved.aiAction,
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