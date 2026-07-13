/**
 * ==========================================================
 * RecommendationEngine
 * ==========================================================
 *
 * Converts the completed investment thesis into a
 * standardized recommendation.
 *
 * Responsibilities
 * ----------------
 * ✔ Interpret investment thesis
 * ✔ Determine action
 * ✔ Calculate conviction
 * ✔ Calculate urgency
 * ✔ Calculate risk level
 * ✔ Build execution hints
 * ✔ Generate recommendation explanation
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Fetch APIs
 * ✘ Save MongoDB
 * ✘ Send notifications
 *
 * ==========================================================
 */

import {

    setRecommendation,

    addDebug,

} from "./AIContextUtils.js";

// ==========================================================
// Constants
// ==========================================================

const ACTIONS = Object.freeze({

    AVOID: "AVOID",

    WATCH: "WATCH",

    ACCUMULATE: "ACCUMULATE",

    BUY: "BUY",

    STRONG_BUY: "STRONG_BUY",

    HOLD: "HOLD",

    REDUCE: "REDUCE",

    PARTIAL_EXIT: "PARTIAL_EXIT",

    FULL_EXIT: "FULL_EXIT",

});

const CONVICTION = Object.freeze({

    VERY_LOW: "VERY_LOW",

    LOW: "LOW",

    MODERATE: "MODERATE",

    HIGH: "HIGH",

    VERY_HIGH: "VERY_HIGH",

});

const URGENCY = Object.freeze({

    LOW: "LOW",

    NORMAL: "NORMAL",

    HIGH: "HIGH",

    CRITICAL: "CRITICAL",

});

const RISK = Object.freeze({

    VERY_LOW: "VERY_LOW",

    LOW: "LOW",

    MEDIUM: "MEDIUM",

    HIGH: "HIGH",

    EXTREME: "EXTREME",

});

// ==========================================================
// Helpers
// ==========================================================

function getConfidence(context) {

    return Number(

        context?.investmentThesis?.confidence ??

        context?.confidence ??

        0

    );

}

function getThesis(context) {

    return context?.investmentThesis ?? {};

}

// ==========================================================
// Action
// ==========================================================

function calculateAction(
    context,
    confidence
) {

    const exitReadiness =
        context.exitReadiness;

    const positionHealth =
        context.positionHealth;

    if (
        exitReadiness === "EXIT_NOW"
    ) {

        return ACTIONS.FULL_EXIT;

    }

    if (
        exitReadiness === "PREPARE_EXIT"
    ) {

        return ACTIONS.PARTIAL_EXIT;

    }

    if (
        positionHealth === "CRITICAL"
    ) {

        return ACTIONS.FULL_EXIT;

    }

    if (
        positionHealth === "WEAK"
    ) {

        return ACTIONS.REDUCE;

    }

    if (confidence >= 90) {

        return ACTIONS.STRONG_BUY;

    }

    if (confidence >= 80) {

        return ACTIONS.BUY;

    }

    if (confidence >= 65) {

        return ACTIONS.ACCUMULATE;

    }

    if (confidence >= 50) {

        return ACTIONS.HOLD;

    }

    if (confidence >= 35) {

        return ACTIONS.REDUCE;

    }

    if (confidence >= 20) {

        return ACTIONS.PARTIAL_EXIT;

    }

    return ACTIONS.FULL_EXIT;

}

// ==========================================================
// Conviction
// ==========================================================

function calculateConviction(

    confidence

) {

    if (confidence >= 90)

        return CONVICTION.VERY_HIGH;

    if (confidence >= 75)

        return CONVICTION.HIGH;

    if (confidence >= 60)

        return CONVICTION.MODERATE;

    if (confidence >= 40)

        return CONVICTION.LOW;

    return CONVICTION.VERY_LOW;

}

// ==========================================================
// Risk Level
// ==========================================================

function calculateRisk(

    confidence

) {

    if (confidence >= 90)

        return RISK.VERY_LOW;

    if (confidence >= 75)

        return RISK.LOW;

    if (confidence >= 55)

        return RISK.MEDIUM;

    if (confidence >= 35)

        return RISK.HIGH;

    return RISK.EXTREME;

}

// ==========================================================
// Urgency
// ==========================================================

function calculateUrgency(

    action

) {

    switch (action) {

        case ACTIONS.STRONG_BUY:

            return URGENCY.HIGH;

        case ACTIONS.FULL_EXIT:

            return URGENCY.CRITICAL;

        case ACTIONS.PARTIAL_EXIT:

            return URGENCY.HIGH;

        default:

            return URGENCY.NORMAL;

    }

}

// ==========================================================
// Execution Hints
// ==========================================================

function buildExecutionHints(
    action
) {

    return {

        shouldBuy:
            action === ACTIONS.BUY ||
            action === ACTIONS.STRONG_BUY ||
            action === ACTIONS.ACCUMULATE,

        shouldSell:
            action === ACTIONS.PARTIAL_EXIT ||
            action === ACTIONS.FULL_EXIT,

        shouldReduce:
            action === ACTIONS.REDUCE,

        shouldExit:
            action === ACTIONS.FULL_EXIT,

        shouldMonitor:
            action !== ACTIONS.FULL_EXIT,

    };

}

// ==========================================================
// Explanation
// ==========================================================

function buildExplanation(
    thesis
) {

    return {

        summary:
            thesis.summary || "",

        positives:
            thesis.strengths || [],

        negatives:
            thesis.weaknesses || [],

        risks:
            thesis.risks || [],

        assumptions:
            thesis.assumptions || [],

        conditions:
            thesis.monitoringPriorities || [],

    };

}

// ==========================================================
// Scorecard
// ==========================================================

function buildScorecard(
    context
) {

    const analyses =
        context.analyses || {};

    return {

        confidence:
            context.confidence ?? 0,

        liquidity:
            analyses.liquidity?.score ?? null,

        volume:
            analyses.volume?.score ?? null,

        momentum:
            analyses.momentum?.score ?? null,

        wallets:
            analyses.wallets?.score ?? null,

        holders:
            analyses.holders?.score ?? null,

        chart:
            analyses.chart?.score ?? null,

        forecast:
            analyses.forecast?.score ?? null,

        risk:
            analyses.risk?.score ?? null,

    };

}

// ==========================================================
// Recommendation Builder
// ==========================================================

function buildRecommendation(
    context
) {

    const confidence =
        getConfidence(context);

    const thesis =
        getThesis(context);

    const action =
    calculateAction(

        context,

        confidence

    );

    return {

        action,

        confidence,

        conviction:

            calculateConviction(
                confidence
            ),

        urgency:

            calculateUrgency(
                action
            ),

        riskLevel:

            calculateRisk(
                confidence
            ),

        explanation:

            buildExplanation(
                thesis
            ),

        scorecard:

            buildScorecard(
                context
            ),

        execution:

            buildExecutionHints(
                action
            ),

       generatedAt:
    new Date(),

engine:
    "RecommendationEngine",

version:
    "1.0.0",

    };

}

// ==========================================================
// Generate Recommendation
// ==========================================================

export function runRecommendationEngine(
    context
) {

    if (!context) {

        throw new Error(

            "RecommendationEngine: context is required."

        );

    }

    const recommendation =

        buildRecommendation(
            context
        );

    setRecommendation(

        context,

        recommendation

    );

    addDebug(

        context,

        "Recommendation generated.",

        {

            action:

                recommendation.action,

            confidence:

                recommendation.confidence,

            conviction:

                recommendation.conviction,

            urgency:

                recommendation.urgency,

            riskLevel:

                recommendation.riskLevel,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    runRecommendationEngine,

};