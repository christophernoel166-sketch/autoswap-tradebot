/**
 * ==========================================================
 * AI Exit Pipeline
 * ==========================================================
 *
 * Orchestrates the complete AI exit decision process.
 *
 * Responsibilities
 * ----------------
 * ✔ Create standardized pipeline context
 * ✔ Evaluate position health
 * ✔ Evaluate protection strategy
 * ✔ Generate exit decision
 * ✔ Coordinate AI decisions
 * ✔ Produce execution plan
 *
 * NEVER
 * -----
 * ✘ Execute blockchain transactions
 * ✘ Buy tokens
 * ✘ Sell tokens
 * ✘ Call Jupiter
 * ✘ Modify Redis
 * ✘ Save MongoDB
 *
 * ==========================================================
 */

import { addDebug } from "../core/AIContextUtils.js";
import { createPipelineContext } from "../core/createPipelineContext.js";

import {
    evaluatePositionHealth,
} from "../services/PositionIntelligenceEngine.js";

import {
    runProtectionStrategyEngine,
} from "../services/ProtectionStrategyEngine.js";

import {
    runAIExitEngine,
} from "../core/AIExitEngine.js";

import {
    generateTradeDecision,
} from "../orchestration/TradeDecisionCoordinator.js";

import {
    buildTradeManagementPlan,
} from "../orchestration/TradeManagementPlanner.js";

/**
 * ==========================================================
 * Process AI Exit Pipeline
 * ==========================================================
 */

export async function processAIExitPipeline(tradeRequest) {

    if (!tradeRequest) {

        throw new Error(
            "AI Exit Pipeline: tradeRequest is required."
        );

    }

    // ======================================================
    // Create Standardized Pipeline Context
    // ======================================================

    const context = createPipelineContext(
        tradeRequest
    );

    context.metadata.aiReviewed = true;

    // ======================================================
    // Pipeline Started
    // ======================================================

    context.pipeline.stage = "STARTED";

    addDebug(
        context,
        "AI Exit Pipeline started.",
        {
            requestId: context.requestId,
            walletAddress: context.walletAddress,
            mint: context.mint,
        }
    );

    try {

        // ==================================================
        // 1. Position Health
        // ==================================================

        context.pipeline.stage = "POSITION_HEALTH";

        evaluatePositionHealth(context);

        // ==================================================
        // 2. Protection Strategy
        // ==================================================

        context.pipeline.stage = "PROTECTION_STRATEGY";

        runProtectionStrategyEngine(context);

        // ==================================================
        // 3. Exit Decision
        // ==================================================

        context.pipeline.stage = "EXIT_DECISION";

        runAIExitEngine(context);

        // ==================================================
        // 4. Trade Decision Coordination
        // ==================================================

        context.pipeline.stage = "TRADE_DECISION";

        generateTradeDecision(context);

        // ==================================================
        // 5. Trade Management Planning
        // ==================================================

        context.pipeline.stage = "TRADE_PLANNING";

        buildTradeManagementPlan(context);

        // ==================================================
        // Pipeline Completed
        // ==================================================

        context.pipeline.stage = "COMPLETED";

        context.pipeline.status = "COMPLETED";

        context.pipeline.completedAt = new Date();

        context.execution.approved =

    Boolean(

        context.tradePlan &&

        context.tradePlan.action &&

        context.tradePlan.action !== "HOLD" &&

        context.tradePlan.action !== "CONTINUE"

    );

        context.metrics.pipelineDurationMs =
            context.pipeline.completedAt.getTime() -
            context.pipeline.startedAt.getTime();

        addDebug(
            context,
            "AI Exit Pipeline completed.",
            {
                requestId: context.requestId,
                approved: context.execution.approved,
                action: context.tradePlan?.action,
            }
        );

        return {

    approved:

        context.execution.approved,

    tradePlan:

        context.tradePlan
            ? {

                ...context.tradePlan,

                requestId:

                    context.requestId,

                metadata:

                    context.metadata,

                user:

                    context.user,

                walletAddress:

                    context.walletAddress,

                wallet:

                    context.wallet,

                mint:

                    context.mint,

                sourceChannel:

                    context.sourceChannel,

            }
            : null,

    context,

};

    } catch (error) {

        context.pipeline.stage = "FAILED";

        context.pipeline.status = "FAILED";

        context.pipeline.completedAt = new Date();

        context.execution.approved = false;

        context.diagnostics.errors.push({

            message: error.message,

            stack: error.stack,

            timestamp: new Date(),

        });

        addDebug(
            context,
            "AI Exit Pipeline failed.",
            {
                requestId: context.requestId,
                error: error.message,
            }
        );

        throw error;

    }

}

export default {

    processAIExitPipeline,

};