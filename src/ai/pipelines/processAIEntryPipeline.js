/**
 * ==========================================================
 * AI Entry Pipeline
 * ==========================================================
 *
 * Orchestrates the complete AI entry decision process.
 *
 * Responsibilities
 * ----------------
 * ✔ Create standardized pipeline context
 * ✔ Build investment thesis
 * ✔ Generate recommendation
 * ✔ Validate entry
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
    buildInvestmentThesis,
} from "../services/InvestmentThesisBuilder.js";

import {
    runRecommendationEngine,
} from "../services/RecommendationEngine.js";

import {
    runEntryValidationEngine,
} from "../services/EntryValidationEngine.js";

import {
    generateTradeDecision,
} from "../orchestration/TradeDecisionCoordinator.js";

import {
    buildTradeManagementPlan,
} from "../orchestration/TradeManagementPlanner.js";

/**
 * ==========================================================
 * Process AI Entry Pipeline
 * ==========================================================
 */

export async function processAIEntryPipeline(tradeRequest) {

    if (!tradeRequest) {

        throw new Error(
            "AI Entry Pipeline: tradeRequest is required."
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
        "AI Entry Pipeline started.",
        {
            requestId: context.requestId,
            walletAddress: context.walletAddress,
            mint: context.mint,
        }
    );

    try {

        // ==================================================
        // 1. Investment Thesis
        // ==================================================

        context.pipeline.stage = "INVESTMENT_THESIS";

        buildInvestmentThesis(context);

        // ==================================================
        // 2. Recommendation Engine
        // ==================================================

        context.pipeline.stage = "RECOMMENDATION";

        runRecommendationEngine(context);

        // ==================================================
        // 3. Entry Validation
        // ==================================================

        context.pipeline.stage = "ENTRY_VALIDATION";

        runEntryValidationEngine(context);

        // ==================================================
        // 4. Trade Decision
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
            Boolean(context.tradePlan);

        context.metrics.pipelineDurationMs =
            context.pipeline.completedAt.getTime() -
            context.pipeline.startedAt.getTime();

        addDebug(
            context,
            "AI Entry Pipeline completed.",
            {
                requestId: context.requestId,
                approved: context.execution.approved,
                action: context.tradePlan?.action,
            }
        );

        return {

            approved:
                context.execution.approved,

            context,

            tradePlan:
                context.tradePlan,

        };

    } catch (error) {

        // ==================================================
        // Pipeline Failed
        // ==================================================

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
            "AI Entry Pipeline failed.",
            {
                requestId: context.requestId,
                error: error.message,
            }
        );

        throw error;

    }

}

export default {

    processAIEntryPipeline,

};