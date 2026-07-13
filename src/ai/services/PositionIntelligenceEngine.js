/**
 * ==========================================================
 * PositionIntelligenceEngine
 * ==========================================================
 *
 * Evaluates the health and evolution of an active position.
 *
 * Responsibilities
 * ----------------
 * ✔ Evaluate position health
 * ✔ Detect trend changes
 * ✔ Compare previous AI state
 * ✔ Evaluate confidence trend
 * ✔ Evaluate conviction trend
 * ✔ Evaluate risk trend
 * ✔ Build alerts
 * ✔ Build watch items
 * ✔ Build opportunities
 * ✔ Generate position summary
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

    setPositionHealth,

    addDebug,

} from "../core/AIContextUtils.js";

// ==========================================================
// Constants
// ==========================================================

const HEALTH = Object.freeze({

    EXCELLENT: "EXCELLENT",

    STRONG: "STRONG",

    GOOD: "GOOD",

    STABLE: "STABLE",

    WEAK: "WEAK",

    CRITICAL: "CRITICAL",

});

const TREND = Object.freeze({

    STRONGLY_IMPROVING:
        "STRONGLY_IMPROVING",

    IMPROVING:
        "IMPROVING",

    STABLE:
        "STABLE",

    WEAKENING:
        "WEAKENING",

    STRONGLY_WEAKENING:
        "STRONGLY_WEAKENING",

});

const DIRECTION = Object.freeze({

    INCREASING:
        "INCREASING",

    DECREASING:
        "DECREASING",

    UNCHANGED:
        "UNCHANGED",

});

// ==========================================================
// Helpers
// ==========================================================

function getConfidence(
    context
) {

    return Number(

        context?.confidence ?? 0

    );

}

function getRecommendation(
    context
) {

    return context?.recommendation ?? {};

}

function getPreviousPosition(
    context
) {

    return context?.previousPositionIntelligence ?? {};

}

// ==========================================================
// Direction Comparator
// ==========================================================

function compareDirection(
    previous,
    current
) {

    previous = Number(
        previous ?? current
    );

    current = Number(
        current ?? previous
    );

    if (current > previous) {

        return DIRECTION.INCREASING;

    }

    if (current < previous) {

        return DIRECTION.DECREASING;

    }

    return DIRECTION.UNCHANGED;

}

// ==========================================================
// Position Health
// ==========================================================

function calculateHealth(
    confidence
) {

    if (confidence >= 90)
        return HEALTH.EXCELLENT;

    if (confidence >= 80)
        return HEALTH.STRONG;

    if (confidence >= 65)
        return HEALTH.GOOD;

    if (confidence >= 50)
        return HEALTH.STABLE;

    if (confidence >= 35)
        return HEALTH.WEAK;

    return HEALTH.CRITICAL;

}

// ==========================================================
// Overall Trend
// ==========================================================

function calculateTrend(
    confidence
) {

    if (confidence >= 90)
        return TREND.STRONGLY_IMPROVING;

    if (confidence >= 70)
        return TREND.IMPROVING;

    if (confidence >= 50)
        return TREND.STABLE;

    if (confidence >= 30)
        return TREND.WEAKENING;

    return TREND.STRONGLY_WEAKENING;

}

// ==========================================================
// Confidence Trend
// ==========================================================

function calculateConfidenceTrend(
    previousConfidence,
    confidence
) {

    return compareDirection(

        previousConfidence,

        confidence

    );

}

// ==========================================================
// Conviction Trend
// ==========================================================

function calculateConvictionTrend(
    previousRecommendation,
    recommendation
) {

    const ranking = {

        VERY_LOW: 1,

        LOW: 2,

        MODERATE: 3,

        HIGH: 4,

        VERY_HIGH: 5,

    };

    return compareDirection(

        ranking[
            previousRecommendation?.conviction
        ] ?? 0,

        ranking[
            recommendation?.conviction
        ] ?? 0

    );

}

// ==========================================================
// Risk Trend
// ==========================================================

function calculateRiskTrend(
    previousRecommendation,
    recommendation
) {

    const ranking = {

        VERY_LOW: 1,

        LOW: 2,

        MEDIUM: 3,

        HIGH: 4,

        EXTREME: 5,

    };

    return compareDirection(

        ranking[
            previousRecommendation?.riskLevel
        ] ?? 0,

        ranking[
            recommendation?.riskLevel
        ] ?? 0

    );

}

// ==========================================================
// Alerts
// ==========================================================

function buildAlerts(
    recommendation
) {

    const alerts = [];

    if (
        recommendation.riskLevel === "HIGH" ||
        recommendation.riskLevel === "EXTREME"
    ) {

        alerts.push(
            "Overall position risk is elevated."
        );

    }

    if (
        recommendation.action === "FULL_EXIT"
    ) {

        alerts.push(
            "Immediate exit conditions detected."
        );

    }

    if (
        recommendation.action === "PARTIAL_EXIT"
    ) {

        alerts.push(
            "Consider reducing exposure."
        );

    }

    return alerts;

}

// ==========================================================
// Watch Items
// ==========================================================

function buildWatchItems(
    recommendation
) {

    const watchItems = [];

    if (
        recommendation.action === "HOLD"
    ) {

        watchItems.push(
            "Continue monitoring for confirmation."
        );

    }

    if (
        recommendation.action === "ACCUMULATE"
    ) {

        watchItems.push(
            "Watch for additional accumulation opportunities."
        );

    }

    if (
        recommendation.riskLevel === "MEDIUM"
    ) {

        watchItems.push(
            "Monitor for increasing downside risk."
        );

    }

    return watchItems;

}

// ==========================================================
// Opportunities
// ==========================================================

function buildOpportunities(
    recommendation
) {

    const opportunities = [];

    if (
        recommendation.action === "STRONG_BUY"
    ) {

        opportunities.push(
            "High conviction entry opportunity."
        );

    }

    if (
        recommendation.action === "BUY"
    ) {

        opportunities.push(
            "Healthy buying conditions remain."
        );

    }

    if (
        recommendation.action === "ACCUMULATE"
    ) {

        opportunities.push(
            "Gradual position expansion is supported."
        );

    }

    return opportunities;

}

// ==========================================================
// Recommendation Trend
// ==========================================================

function calculateRecommendationTrend(
    previousRecommendation,
    recommendation
) {

    const ranking = {

        AVOID: 1,

        FULL_EXIT: 2,

        PARTIAL_EXIT: 3,

        REDUCE: 4,

        HOLD: 5,

        ACCUMULATE: 6,

        BUY: 7,

        STRONG_BUY: 8,

    };

    return compareDirection(

        ranking[
            previousRecommendation?.action
        ] ?? 0,

        ranking[
            recommendation?.action
        ] ?? 0

    );

}

// ==========================================================
// Summary
// ==========================================================

function generateSummary({

    health,

    trend,

    recommendation,

    confidenceTrend,

    riskTrend,

}) {

    return [

        `Position health is ${health.toLowerCase()}.`,

        `Overall trend is ${trend.toLowerCase().replaceAll("_", " ")}.`,

        `AI confidence is ${confidenceTrend.toLowerCase()}.`,

        `Risk is ${riskTrend.toLowerCase()}.`,

        `Current recommendation is ${recommendation.action.toLowerCase().replaceAll("_", " ")}.`,

    ].join(" ");

}

// ==========================================================
// Builder
// ==========================================================

function buildPositionIntelligence(
    context
) {

    const confidence =
        getConfidence(context);

    const recommendation =
        getRecommendation(context);

    const previous =
        getPreviousPosition(context);

    const previousRecommendation =
        previous.recommendation || {};

    const health =
        calculateHealth(
            confidence
        );

    const trend =
        calculateTrend(
            confidence
        );

    const confidenceTrend =
        calculateConfidenceTrend(

            previous.confidence,

            confidence

        );

    const convictionTrend =
        calculateConvictionTrend(

            previousRecommendation,

            recommendation

        );

    const riskTrend =
        calculateRiskTrend(

            previousRecommendation,

            recommendation

        );

    const recommendationTrend =
        calculateRecommendationTrend(

            previousRecommendation,

            recommendation

        );

    return {

        overallHealth:
            health,
           

        confidence,

        recommendation,

        trend,

        confidenceTrend,

        convictionTrend,

        riskTrend,

        recommendationTrend,

        alerts:
            buildAlerts(
                recommendation
            ),

        watchItems:
            buildWatchItems(
                recommendation
            ),

        opportunities:
            buildOpportunities(
                recommendation
            ),

        summary:

            generateSummary({

                health,

                trend,

                recommendation,

                confidenceTrend,

                riskTrend,

            }),

        generatedAt:
            new Date(),

        engine:
            "PositionIntelligenceEngine",

        version:
            "1.0.0",

    };

}

// ==========================================================
// Generate Position Intelligence
// ==========================================================

export function evaluatePositionHealth(
    context
) {

    if (!context) {

        throw new Error(

            "PositionIntelligenceEngine: context is required."

        );

    }

    const intelligence =

        buildPositionIntelligence(
            context
        );

    setPositionHealth(

        context,

        intelligence

    );

    addDebug(

        context,

        "Position intelligence generated.",

        {

            health:
                intelligence.overallHealth,

            trend:
                intelligence.trend,

            confidenceTrend:
                intelligence.confidenceTrend,

            convictionTrend:
                intelligence.convictionTrend,

            riskTrend:
                intelligence.riskTrend,

            recommendationTrend:
                intelligence.recommendationTrend,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    evaluatePositionHealth,

};