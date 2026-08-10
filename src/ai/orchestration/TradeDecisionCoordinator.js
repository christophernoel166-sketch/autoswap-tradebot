/**
 * ==========================================================
 * TradeDecisionCoordinator
 * ==========================================================
 *
 * Converts multiple AI opinions into one unified trading
 * decision.
 *
 * Responsibilities
 * ----------------
 * ✔ Collect AI decisions
 * ✔ Detect conflicts
 * ✔ Apply decision hierarchy
 * ✔ Measure consensus
 * ✔ Produce one final decision
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Modify positions
 * ✘ Fetch APIs
 * ✘ Save MongoDB
 *
 * ==========================================================
 */

import {
    addDebug,
} from "../core/AIContextUtils.js";

// ==========================================================
// Consensus
// ==========================================================

const CONSENSUS = Object.freeze({

    VERY_LOW: "VERY_LOW",

    LOW: "LOW",

    MODERATE: "MODERATE",

    HIGH: "HIGH",

    VERY_HIGH: "VERY_HIGH",

});

// ==========================================================
// Execution Intent
// ==========================================================

const EXECUTION = Object.freeze({

    CONTINUE_POSITION:
        "CONTINUE_POSITION",

    SCALE_OUT_POSITION:
        "SCALE_OUT_POSITION",

    PARTIAL_EXIT_POSITION:
        "PARTIAL_EXIT_POSITION",

    FULL_EXIT_POSITION:
        "FULL_EXIT_POSITION",

});

// ==========================================================
// Decision Hierarchy
// ==========================================================
//
// Exit decisions have the highest priority.
// Protection decisions come next.
// Position health comes next.
// Recommendation is informational and does NOT directly
// become a position action.
//
// ==========================================================

const PRIORITY = Object.freeze({

    EXIT: 4,

    PROTECTION: 3,

    POSITION: 2,

    RECOMMENDATION: 1,

});

// ==========================================================
// Recommendation Types
// ==========================================================

const RECOMMENDATIONS = Object.freeze({

    STRONG_BUY:
        "STRONG_BUY",

    BUY:
        "BUY",

    WATCH:
        "WATCH",

    AVOID:
        "AVOID",

    REJECT:
        "REJECT",

});

// ==========================================================
// Get Normalized Recommendation
// ==========================================================

// FULL_EXIT / PARTIAL_EXIT decisions continue to come
// from the higher-priority position-management engines.
// ==========================================================

function getRecommendation(context) {

    const recommendation =
        context?.recommendation ??
        context?.tradeDecision?.recommendation ??
        null;


    // ======================================================
    // No recommendation available
    // ======================================================

    if (!recommendation) {

        return {

            recommendation: null,

            confidence: 0,

            confidenceGrade: null,

            reasons: [],

        };

    }


    // ======================================================
    // String compatibility
    //
    // Supports:
    //
    // context.recommendation = "WATCH"
    // ======================================================

    if (
        typeof recommendation === "string"
    ) {

        return {

            recommendation,

            confidence: 0,

            confidenceGrade: null,

            reasons: [],

        };

    }


    // ======================================================
    // Normalize recommendation value
    //
    // Preferred:
    //
    // recommendation.recommendation
    //
    // Compatibility:
    //
    // recommendation.action
    // ======================================================

    const recommendationValue =
        recommendation.recommendation ??
        recommendation.action ??
        null;


    // ======================================================
    // Normalize confidence
    // ======================================================

    const normalizedConfidence =
        Number(
            recommendation.confidence ??
            0
        );


    // ======================================================
    // Normalize confidence grade
    // ======================================================

    const normalizedConfidenceGrade =
        recommendation.confidenceGrade ??
        null;


    // ======================================================
    // Normalize reasons
    //
    // Different recommendation engines may use
    // different names for explanatory information.
    // ======================================================

    let normalizedReasons = [];

    if (
        Array.isArray(
            recommendation.reasons
        )
    ) {

        normalizedReasons =
            recommendation.reasons;

    }
    else if (
        Array.isArray(
            recommendation.explanation
        )
    ) {

        normalizedReasons =
            recommendation.explanation;

    }
    else if (
        Array.isArray(
            recommendation.reasoning
        )
    ) {

        normalizedReasons =
            recommendation.reasoning;

    }


    // ======================================================
    // Return normalized recommendation
    // ======================================================

    return {

        ...recommendation,

        recommendation:
            recommendationValue,

        confidence:
            normalizedConfidence,

        confidenceGrade:
            normalizedConfidenceGrade,

        reasons:
            normalizedReasons,

    };

}

// ==========================================================
// Recommendation Classification
// ==========================================================

function isBullishRecommendation(
    recommendation
) {

    return (

        recommendation ===
            RECOMMENDATIONS.STRONG_BUY ||

        recommendation ===
            RECOMMENDATIONS.BUY

    );

}

function isNegativeRecommendation(
    recommendation
) {

    return (

        recommendation ===
            RECOMMENDATIONS.AVOID ||

        recommendation ===
            RECOMMENDATIONS.REJECT

    );

}

// ==========================================================
// Protection
// ==========================================================

function getProtection(
    context
) {

    return (
        context.protectionStrategy ??
        {}
    );

}

// ==========================================================
// Position
// ==========================================================

function getPosition(
    context
) {

    return (
        context.positionHealth ??
        {}
    );

}

// ==========================================================
// Exit
// ==========================================================

function getExit(
    context
) {

    return (
        context.exitDecision ??
        {}
    );

}

// ==========================================================
// Collect Decisions
// ==========================================================

function collectDecisions(
    context
) {

return {

    recommendation:

        getRecommendation(
            context
        ),

    protection:

        getProtection(
            context
        ),

    position:

        getPosition(
            context
        ),

    exit:

        getExit(
            context
        ),

};

}

// ==========================================================
// Conflict Detection
// ==========================================================
//
// We do NOT compare WATCH against CRITICAL as if they
// were the same type of value.
//
// Instead we detect meaningful disagreement:
//
// • Strong bullish recommendation + exit decision
// • Negative recommendation + continue position
// • Exit decision + weak protection
//
// ==========================================================

function detectConflicts(
    decisions
) {

    const recommendation =
        decisions
            .recommendation
            ?.recommendation;

    const exitDecision =
        decisions
            .exit
            ?.decision;

    const protectionIntent =
        decisions
            .protection
            ?.protectionIntent;

    const positionHealth =
        decisions
            .position
            ?.overallHealth;

    // ------------------------------------------------------
    // Strong bullish recommendation vs exit
    // ------------------------------------------------------

    if (

        isBullishRecommendation(
            recommendation
        ) &&

        exitDecision &&

        exitDecision !== "CONTINUE"

    ) {

        return true;

    }

    // ------------------------------------------------------
    // Negative recommendation vs continuation
    // ------------------------------------------------------

    if (

        isNegativeRecommendation(
            recommendation
        ) &&

        (
            exitDecision ===
                "CONTINUE" ||

            exitDecision ===
                "HOLD"
        )

    ) {

        return true;

    }

    // ------------------------------------------------------
    // Critical health but no protective response
    // ------------------------------------------------------

    if (

        positionHealth ===
            "CRITICAL" &&

        !exitDecision &&

        !protectionIntent

    ) {

        return true;

    }

    return false;

}

// ==========================================================
// Consensus
// ==========================================================
//
// Consensus is based on the number of meaningful signals,
// not on whether unrelated strings are identical.
//
// ==========================================================

function calculateConsensus(
    decisions
) {

    const signals = [];

    const recommendation =
        decisions
            .recommendation
            ?.recommendation;

    const protection =
        decisions
            .protection
            ?.protectionIntent;

    const health =
        decisions
            .position
            ?.overallHealth;

    const exit =
        decisions
            .exit
            ?.decision;

    if (recommendation) {

        signals.push({
            type: "recommendation",
            value: recommendation,
        });

    }

    if (protection) {

        signals.push({
            type: "protection",
            value: protection,
        });

    }

    if (health) {

        signals.push({
            type: "health",
            value: health,
        });

    }

    if (exit) {

        signals.push({
            type: "exit",
            value: exit,
        });

    }

    if (signals.length === 0) {

        return CONSENSUS.VERY_LOW;

    }

    // ------------------------------------------------------
    // Strong exit agreement
    // ------------------------------------------------------

    const hasExit =
        exit === "FULL_EXIT" ||
        exit === "PARTIAL_EXIT";

    const hasCriticalHealth =
        health === "CRITICAL";

    const hasExitProtection =
        protection ===
            "PREPARE_EXIT" ||

        protection ===
            "LOCK_PROFIT" ||

        protection ===
            "FULL_EXIT";

    if (

        hasExit &&

        (
            hasCriticalHealth ||
            hasExitProtection
        )

    ) {

        return CONSENSUS.VERY_HIGH;

    }

    // ------------------------------------------------------
    // Bullish agreement
    // ------------------------------------------------------

    const bullish =
        isBullishRecommendation(
            recommendation
        );

    const healthy =
        health === "HEALTHY" ||
        health === "STRONG" ||
        health === "STABLE";

    if (
        bullish &&
        healthy
    ) {

        return CONSENSUS.HIGH;

    }

    // ------------------------------------------------------
    // Single meaningful signal
    // ------------------------------------------------------

    if (
        signals.length === 1
    ) {

        return CONSENSUS.LOW;

    }

    // ------------------------------------------------------
    // Multiple signals without strong alignment
    // ------------------------------------------------------

    if (
        signals.length === 2
    ) {

        return CONSENSUS.MODERATE;

    }

    return CONSENSUS.HIGH;

}

// ==========================================================
// Highest Priority Decision
// ==========================================================
//
// IMPORTANT:
//
// Recommendation is NOT converted into an execution action.
//
// Therefore:
//
// WATCH
//
// never becomes:
//
// action: "WATCH"
//
// ==========================================================

function getHighestPriorityDecision(
    decisions
) {

    // ======================================================
    // 1. EXIT
    // ======================================================

    if (
        decisions.exit?.decision
    ) {

        return {

            source:
                "AIExitEngine",

            action:
                decisions.exit.decision,

            confidence:
                Number(
                    decisions.exit.confidence ??
                    0
                ),

            priority:
                PRIORITY.EXIT,

        };

    }

    // ======================================================
    // 2. PROTECTION
    // ======================================================

    if (
        decisions.protection
            ?.protectionIntent
    ) {

        const intent =
            decisions.protection
                .protectionIntent;

        // --------------------------------------------------
        // Protection intents that represent actual
        // position-management actions.
        // --------------------------------------------------

        const protectionActionMap = {

            FULL_EXIT:
                "FULL_EXIT",

            PARTIAL_EXIT:
                "PARTIAL_EXIT",

            SCALE_OUT:
                "SCALE_OUT",

            CONTINUE:
                "CONTINUE",

            HOLD:
                "HOLD",

        };

        const action =
            protectionActionMap[
                intent
            ];

        if (action) {

            return {

                source:
                    "ProtectionStrategyEngine",

                action,

                confidence:
                    Number(
                        decisions
                            .protection
                            .confidence ??
                        0
                    ),

                priority:
                    PRIORITY.PROTECTION,

            };

        }

    }

    // ======================================================
    // 3. POSITION HEALTH
    // ======================================================

    const health =
        decisions.position
            ?.overallHealth;

    if (
        health === "CRITICAL"
    ) {

        return {

            source:
                "PositionIntelligenceEngine",

            action:
                "HOLD",

            confidence:
                0,

            priority:
                PRIORITY.POSITION,

        };

    }

    // ======================================================
    // 4. No execution action
    // ======================================================

    return null;

}

// ==========================================================
// Final Decision
// ==========================================================

function determineFinalDecision(
    context,
    decisions
) {

    const highest =
        getHighestPriorityDecision(
            decisions
        );

    const recommendation =
        decisions
            .recommendation;

    // ======================================================
    // No position-management decision
    // ======================================================

    if (!highest) {

        return {

            action:
                "HOLD",

            confidence:
                recommendation
                    ?.confidence ??
                0,

            source:
                "RecommendationEngine",

        };

    }

    // ======================================================
    // High-confidence emergency exits always win.
    // ======================================================

    if (

        highest.source ===
            "AIExitEngine" &&

        highest.confidence >= 90

    ) {

        return highest;

    }

    // ======================================================
    // Medium-confidence exits require support.
    // ======================================================

    if (

        highest.source ===
            "AIExitEngine" &&

        highest.confidence >= 70

    ) {

        if (

            decisions
                .protection
                ?.protectionIntent ===
                "PREPARE_EXIT" ||

            decisions
                .protection
                ?.protectionIntent ===
                "LOCK_PROFIT" ||

            decisions
                .position
                ?.overallHealth ===
                "CRITICAL"

        ) {

            return highest;

        }

    }

    // ======================================================
    // Low-confidence exits can be overridden by an
    // exceptionally strong bullish recommendation.
    // ======================================================

    if (

        highest.source ===
            "AIExitEngine" &&

        highest.confidence < 70 &&

        recommendation
            ?.recommendation ===
            RECOMMENDATIONS.STRONG_BUY &&

        recommendation
            ?.confidence >= 90

    ) {

        return {

            source:
                "RecommendationEngine",

            action:
                "CONTINUE",

            confidence:
                recommendation.confidence,

            priority:
                PRIORITY.RECOMMENDATION,

        };

    }

    return highest;

}

// ==========================================================
// Execution Intent
// ==========================================================

function determineExecutionIntent(
    action
) {

    switch (action) {

        case "CONTINUE":

        case "HOLD":

            return (
                EXECUTION
                    .CONTINUE_POSITION
            );

        case "SCALE_OUT":

            return (
                EXECUTION
                    .SCALE_OUT_POSITION
            );

        case "PARTIAL_EXIT":

            return (
                EXECUTION
                    .PARTIAL_EXIT_POSITION
            );

        case "FULL_EXIT":

            return (
                EXECUTION
                    .FULL_EXIT_POSITION
            );

        default:

            return (
                EXECUTION
                    .CONTINUE_POSITION
            );

    }

}

// ==========================================================
// Build Reasons
// ==========================================================

function buildReasons(
    decisions,
    finalDecision,
    conflicts
) {

    const reasons = [];

    reasons.push(

        `Final position action supplied by ${finalDecision.source}.`

    );

    // ======================================================
    // Recommendation reason
    // ======================================================

    if (
        decisions
            .recommendation
            ?.recommendation
    ) {

        reasons.push(

            `Market recommendation: ${decisions.recommendation.recommendation}.`

        );

    }

    // ======================================================
    // Conflict state
    // ======================================================

    if (conflicts) {

        reasons.push(

            "Conflicting AI signals detected; higher-priority position-management logic was applied."

        );

    } else {

        reasons.push(

            "AI signals do not show a material conflict."

        );

    }

    // ======================================================
    // Exit reasons
    // ======================================================

    if (

        decisions
            .exit
            ?.reasons
            ?.length

    ) {

        reasons.push(

            ...decisions
                .exit
                .reasons

        );

    }

    // ======================================================
    // Protection reasons
    // ======================================================

    if (

        decisions
            .protection
            ?.reasons
            ?.length

    ) {

        reasons.push(

            ...decisions
                .protection
                .reasons

        );

    }

    return reasons;

}

// ==========================================================
// Approval
// ==========================================================

function determineApproval(
    finalDecision,
    consensus
) {

    // ======================================================
    // Nothing to execute.
    // ======================================================

    if (

        !finalDecision ||

        finalDecision.action ===
            "HOLD" ||

        finalDecision.action ===
            "CONTINUE"

    ) {

        return false;

    }

    // ======================================================
    // High-confidence exit is always approved.
    // ======================================================

    if (

        finalDecision.source ===
            "AIExitEngine" &&

        finalDecision.confidence >= 90

    ) {

        return true;

    }

    // ======================================================
    // Strong consensus is approved.
    // ======================================================

    if (

        consensus ===
            CONSENSUS.VERY_HIGH ||

        consensus ===
            CONSENSUS.HIGH

    ) {

        return true;

    }

    // ======================================================
    // Weak exits require supporting evidence.
    // ======================================================

    if (

        finalDecision.source ===
            "AIExitEngine" &&

        finalDecision.confidence < 70

    ) {

        return false;

    }

    return true;

}

// ==========================================================
// Build Report
// ==========================================================

function buildCoordinatorReport(
    context
) {

    const decisions =
        collectDecisions(
            context
        );

    const conflicts =
        detectConflicts(
            decisions
        );

    const consensus =
        calculateConsensus(
            decisions
        );

    const finalDecision =
        determineFinalDecision(
            context,
            decisions
        );

    // ======================================================
    // Recommendation Engine Output
    // ======================================================

    const recommendation =
        decisions
            .recommendation
            ?.recommendation ??
        null;

    const recommendationConfidence =
        Number(
            decisions
                .recommendation
                ?.confidence ??
            0
        );

    const recommendationConfidenceGrade =
        decisions
            .recommendation
            ?.confidenceGrade ??
        null;

    const recommendationReasons =
        Array.isArray(
            decisions
                .recommendation
                ?.reasons
        )
            ? decisions
                .recommendation
                .reasons
            : [];

    // ======================================================
    // Build Final Coordinator Report
    // ======================================================

    return {

        // --------------------------------------------------
        // Final coordinated POSITION action
        // --------------------------------------------------

        approved:
            determineApproval(
                finalDecision,
                consensus
            ),

        action:
            finalDecision.action,

        executionIntent:
            determineExecutionIntent(
                finalDecision.action
            ),

        confidence:
            Number(
                finalDecision.confidence ??
                0
            ),

        source:
            finalDecision.source,

        // --------------------------------------------------
        // Recommendation Engine result
        // --------------------------------------------------

        recommendation,

        recommendationConfidence,

        recommendationConfidenceGrade,

        recommendationReasons,

        // --------------------------------------------------
        // Consensus
        // --------------------------------------------------

        consensus,

        conflicts,

        // --------------------------------------------------
        // Reasons
        // --------------------------------------------------

        reasons:
            buildReasons(
                decisions,
                finalDecision,
                conflicts
            ),

        // --------------------------------------------------
        // Full evidence from all AI engines
        // --------------------------------------------------

        evidence:
            decisions,

        // --------------------------------------------------
        // Metadata
        // --------------------------------------------------

        generatedAt:
            new Date(),

        engine:
            "TradeDecisionCoordinator",

        version:
            "1.1.0",

    };

}

// ==========================================================
// Generate Final Trade Decision
// ==========================================================

export function generateTradeDecision(
    context
) {

    if (!context) {

        throw new Error(

            "TradeDecisionCoordinator: context is required."

        );

    }

    const report =
        buildCoordinatorReport(
            context
        );

    // ======================================================
    // Store Final Coordinator Decision
    // ======================================================

    context.tradeDecision =
        report;

    // ======================================================
    // Make decision available to planner
    // ======================================================

    context.execution =
        context.execution ||
        {};

    context.execution.tradeDecision =
        report;

    // ======================================================
    // Debug
    // ======================================================

    addDebug(

        context,

        "Trade decision coordinated.",

        {

            action:
                report.action,

            executionIntent:
                report.executionIntent,

            recommendation:
                report.recommendation,

            recommendationConfidence:
                report.recommendationConfidence,

            confidence:
                report.confidence,

            source:
                report.source,

            consensus:
                report.consensus,

            conflicts:
                report.conflicts,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    generateTradeDecision,

};