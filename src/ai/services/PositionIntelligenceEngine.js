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
 * ✔ Analyze AI historical timeline
 * ✔ Detect sustained weakening
 * ✔ Detect protection escalation
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

import {
    analyzeAITimeline,
} from "../../services/AITimelineAnalyzer.js";


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
    recommendation,
    timelineAnalysis
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


    // ======================================================
    // Historical AI deterioration alerts
    // ======================================================

    if (
        timelineAnalysis?.evolution?.state ===
        "STRONGLY_DETERIORATING"
    ) {

        alerts.push(
            "AI history shows strong position deterioration."
        );

    }
    else if (
        timelineAnalysis?.evolution?.state ===
        "DETERIORATING"
    ) {

        alerts.push(
            "AI history shows sustained position deterioration."
        );

    }


    if (
        timelineAnalysis?.confidence?.declining
    ) {

        alerts.push(
            "AI confidence is declining across recent observations."
        );

    }


    if (
        timelineAnalysis?.trend?.transitionToDistribution
    ) {

        alerts.push(
            "Trend has transitioned from bullish conditions toward distribution."
        );

    }


    if (
        timelineAnalysis?.protection?.escalating
    ) {

        alerts.push(
            "AI protection requirements are escalating."
        );

    }


    return alerts;

}


// ==========================================================
// Watch Items
// ==========================================================

function buildWatchItems(
    recommendation,
    timelineAnalysis
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


    // ======================================================
    // Historical deterioration watch items
    // ======================================================

    if (
        timelineAnalysis?.confidence?.declining
    ) {

        watchItems.push(
            "Monitor continued AI confidence deterioration."
        );

    }


    if (
        timelineAnalysis?.health?.weakening
    ) {

        watchItems.push(
            "Monitor weakening position health."
        );

    }


    if (
        timelineAnalysis?.trend?.weakening
    ) {

        watchItems.push(
            "Monitor for continued trend deterioration."
        );

    }


    if (
        timelineAnalysis?.protection?.escalating
    ) {

        watchItems.push(
            "Monitor escalating protection requirements."
        );

    }


    return watchItems;

}


// ==========================================================
// Opportunities
// ==========================================================

function buildOpportunities(
    recommendation,
    timelineAnalysis
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


    // ======================================================
    // Historical improvement opportunities
    // ======================================================

    if (
        timelineAnalysis?.evolution?.state ===
        "IMPROVING"
    ) {

        opportunities.push(
            "Recent AI observations show improving position conditions."
        );

    }


    if (
        timelineAnalysis?.evolution?.state ===
        "STRENGTHENING"
    ) {

        opportunities.push(
            "Position conditions are strengthening across recent AI observations."
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

    recommendation = {},

    confidenceTrend,

    riskTrend,

    timelineAnalysis,

}) {

    const action = String(
        recommendation?.action ?? "UNKNOWN"
    );


    const safeHealth = String(
        health ?? "UNKNOWN"
    );


    const safeTrend = String(
        trend ?? "UNKNOWN"
    );


    const safeConfidenceTrend = String(
        confidenceTrend ?? "UNKNOWN"
    );


    const safeRiskTrend = String(
        riskTrend ?? "UNKNOWN"
    );


    const summary = [

        `Position health is ${safeHealth
            .toLowerCase()}.`,

        `Overall trend is ${safeTrend
            .toLowerCase()
            .replaceAll("_", " ")}.`,

        `AI confidence is ${safeConfidenceTrend
            .toLowerCase()}.`,

        `Risk is ${safeRiskTrend
            .toLowerCase()}.`,

        `Current recommendation is ${action
            .toLowerCase()
            .replaceAll("_", " ")}.`,

    ];


    // ======================================================
    // Historical AI summary
    // ======================================================

    if (
        timelineAnalysis?.available
    ) {

        const evolution =
            timelineAnalysis?.evolution?.state;

        if (evolution) {

            summary.push(
                `Recent AI evolution is ${String(evolution)
                    .toLowerCase()
                    .replaceAll("_", " ")}.`
            );

        }

        if (
            timelineAnalysis?.confidence?.declining
        ) {

            summary.push(
                "Recent AI confidence is declining."
            );

        }

        if (
            timelineAnalysis?.trend?.weakening
        ) {

            summary.push(
                "Recent trend observations show weakening."
            );

        }

    }


    return summary.join(" ");

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


    // ======================================================
    // Existing Position Intelligence
    // ======================================================

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


    // ======================================================
    // 🧠 AI TIMELINE ANALYSIS
    // ======================================================
    //
    // Uses the AI observation history already stored inside
    // context.aiMemory.
    //
    // IMPORTANT:
    // This performs NO RPC calls and does not modify Redis.
    //
    // ======================================================

    const aiMemory =
        context?.aiMemory || {};


    const timelineAnalysis =
        analyzeAITimeline(
            aiMemory,
            {
                windowSize: 10,
            }
        );


    // ======================================================
    // Build Alerts / Watches / Opportunities
    // ======================================================

    const alerts =
        buildAlerts(
            recommendation,
            timelineAnalysis
        );


    const watchItems =
        buildWatchItems(
            recommendation,
            timelineAnalysis
        );


    const opportunities =
        buildOpportunities(
            recommendation,
            timelineAnalysis
        );


    // ======================================================
    // Final Intelligence
    // ======================================================

    return {

        // --------------------------------------------------
        // Core Position Health
        // --------------------------------------------------

        overallHealth:
            health,


        confidence,

        recommendation,

        trend,

        confidenceTrend,

        convictionTrend,

        riskTrend,

        recommendationTrend,


        // --------------------------------------------------
        // 🧠 Historical AI Intelligence
        // --------------------------------------------------

        timelineAnalysis,


        // --------------------------------------------------
        // Alerts
        // --------------------------------------------------

        alerts,


        // --------------------------------------------------
        // Watch Items
        // --------------------------------------------------

        watchItems,


        // --------------------------------------------------
        // Opportunities
        // --------------------------------------------------

        opportunities,


        // --------------------------------------------------
        // Summary
        // --------------------------------------------------

        summary:

            generateSummary({

                health,

                trend,

                recommendation,

                confidenceTrend,

                riskTrend,

                timelineAnalysis,

            }),


        // --------------------------------------------------
        // Metadata
        // --------------------------------------------------

        generatedAt:
            new Date(),


        engine:
            "PositionIntelligenceEngine",


        version:
            "1.1.0",

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

            timelineAvailable:
                intelligence.timelineAnalysis?.available,

            timelineState:
                intelligence.timelineAnalysis?.evolution?.state,

            timelineWeakeningCount:
                intelligence.timelineAnalysis?.evolution?.weakeningCount,

            timelineImprovingCount:
                intelligence.timelineAnalysis?.evolution?.improvingCount,

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