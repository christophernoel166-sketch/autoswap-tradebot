/**
 * ==========================================================
 * Create Pipeline Context
 * ==========================================================
 *
 * Creates a standardized AI context shared by every
 * AI pipeline.
 *
 * Responsibilities
 * ----------------
 * ✔ Normalize trade requests
 * ✔ Initialize pipeline state
 * ✔ Initialize execution state
 * ✔ Initialize metadata
 * ✔ Initialize AI outputs
 * ✔ Initialize telemetry
 *
 * NEVER
 * -----
 * ✘ Execute AI
 * ✘ Buy
 * ✘ Sell
 * ✘ Call APIs
 * ✘ Modify blockchain
 *
 * ==========================================================
 */

export function createPipelineContext(tradeRequest = {}) {

    if (!tradeRequest) {

        throw new Error(
            "Pipeline context requires a trade request."
        );

    }

    const now = new Date();

    return {

        // ==================================================
        // Incoming Request
        // ==================================================

        ...tradeRequest,

        requestId:

            tradeRequest.requestId ??

            crypto.randomUUID(),

        createdAt:

            now,

        contextVersion:

            "1.0.0",

        // ==================================================
        // Pipeline State
        // ==================================================

        pipeline: {

            name:

                tradeRequest.action === "BUY"
                    ? "ENTRY_PIPELINE"
                    : "EXIT_PIPELINE",

            stage:

                "INITIALIZED",

            status:

                "RUNNING",

            startedAt:

                now,

            completedAt:

                null,

        },
 
pipelineHistory: [],
        // ==================================================
        // Execution State
        // ==================================================

        execution: {

            approved:

                false,

            executed:

                false,

            skipped:

                false,

            executionState:

                "PENDING",

        },

        // ==================================================
        // Metadata
        // ==================================================

        metadata: {

            aiReviewed:

                false,

            pipelineVersion:

                "1.0.0",

            ...(tradeRequest.metadata || {}),

        },

        // ==================================================
        // AI Outputs
        // ==================================================

        investmentThesis:

            null,

        recommendation:

            null,

        entryValidation:

            null,

        positionHealth:

            null,

        protectionStrategy:

            null,

        exitDecision:

            null,

        tradeDecision:

            null,

        tradePlan:

            null,

// ==================================================
// Decision Memory
// ==================================================

decisionMemory: {

    previousDecision: null,

    previousRecommendation: null,

    previousProtectionLevel: null,

    previousTradePlan: null,

},

        // ==================================================
        // Review State
        // ==================================================

        pendingReview:

            null,

        reviewEvents:

            [],

        // ==================================================
        // Diagnostics
        // ==================================================

        warnings:

            [],

        errors:

            [],

        debug:

            [],

        // ==================================================
        // Performance Metrics
        // ==================================================

        metrics: {

            pipelineDurationMs:

                null,

            aiProcessingMs:

                null,

        },

    };

}

export default {

    createPipelineContext,

};