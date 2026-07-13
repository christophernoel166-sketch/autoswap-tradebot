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

const PRIORITY = Object.freeze({

    EXIT: 4,

    PROTECTION: 3,

    POSITION: 2,

    RECOMMENDATION: 1,

});

// ==========================================================
// Helpers
// ==========================================================

function getRecommendation(
    context
) {

    return context.recommendation ?? {};

}

function getProtection(
    context
) {

    return context.protectionStrategy ?? {};

}

function getPosition(
    context
) {

    return context.positionHealth ?? {};

}

function getExit(
    context
) {

    return context.exitDecision ?? {};

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

function detectConflicts(
    decisions
) {

    const opinions = [

        decisions.recommendation.action,

        decisions.protection.protectionIntent,

        decisions.position.overallHealth,

        decisions.exit.decision,

    ].filter(Boolean);

    return new Set(

        opinions

    ).size > 1;

}

// ==========================================================
// Consensus
// ==========================================================

function calculateConsensus(
    decisions
) {

    const opinions = [

        decisions.recommendation.action,

        decisions.protection.protectionIntent,

        decisions.position.overallHealth,

        decisions.exit.decision,

    ].filter(Boolean);

    const unique =

        new Set(

            opinions

        ).size;

    switch (unique) {

        case 1:

            return CONSENSUS.VERY_HIGH;

        case 2:

            return CONSENSUS.HIGH;

        case 3:

            return CONSENSUS.MODERATE;

        case 4:

            return CONSENSUS.LOW;

        default:

            return CONSENSUS.VERY_LOW;

    }

}

// ==========================================================
// Highest Priority Decision
// ==========================================================

function getHighestPriorityDecision(
    decisions
) {

    if (

        decisions.exit.decision

    ) {

        return {

            source:

                "AIExitEngine",

            action:

                decisions.exit.decision,

            confidence:

                decisions.exit.confidence ?? 0,

            priority:

                PRIORITY.EXIT,

        };

    }

    if (

        decisions.protection.protectionIntent

    ) {

        return {

            source:

                "ProtectionStrategyEngine",

            action:

                decisions.protection.protectionIntent,

            confidence:

                decisions.protection.confidence ?? 0,

            priority:

                PRIORITY.PROTECTION,

        };

    }

    if (

        decisions.recommendation.action

    ) {

        return {

            source:

                "RecommendationEngine",

            action:

                decisions.recommendation.action,

            confidence:

                decisions.recommendation.confidence ?? 0,

            priority:

                PRIORITY.RECOMMENDATION,

        };

    }

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

    if (!highest) {

        return {

            action: "HOLD",

            confidence: 0,

            source: "NONE",

        };

    }

    const recommendation =

        decisions.recommendation;

    //
    // High-confidence emergency exits always win.
    //

    if (

        highest.source === "AIExitEngine" &&

        highest.confidence >= 90

    ) {

        return highest;

    }

    //
    // Medium-confidence exits require support.
    //

    if (

        highest.source === "AIExitEngine" &&

        highest.confidence >= 70

    ) {

        if (

            decisions.protection.protectionIntent === "PREPARE_EXIT" ||

            decisions.position.overallHealth === "CRITICAL"

        ) {

            return highest;

        }

    }

    //
    // Low-confidence exits can be overridden by
    // a very strong bullish recommendation.
    //

    if (

        highest.source === "AIExitEngine" &&

        highest.confidence < 70 &&

        recommendation.action === "STRONG_BUY" &&

        recommendation.confidence >= 90

    ) {

        return {

            source: "RecommendationEngine",

            action: "CONTINUE",

            confidence:

                recommendation.confidence,

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

            return EXECUTION.CONTINUE_POSITION;

        case "SCALE_OUT":

            return EXECUTION.SCALE_OUT_POSITION;

        case "PARTIAL_EXIT":

            return EXECUTION.PARTIAL_EXIT_POSITION;

        case "FULL_EXIT":

            return EXECUTION.FULL_EXIT_POSITION;

        default:

            return EXECUTION.CONTINUE_POSITION;

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

        `Final decision supplied by ${finalDecision.source}.`

    );

    if (conflicts) {

        reasons.push(

            "Conflicting AI opinions detected."

        );

    } else {

        reasons.push(

            "AI engines are aligned."

        );

    }

    if (

        decisions.exit.reasons?.length

    ) {

        reasons.push(

            ...decisions.exit.reasons

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

    // Nothing to execute.
    if (

        !finalDecision ||

        finalDecision.action === "HOLD" ||

        finalDecision.action === "CONTINUE"

    ) {

        return false;

    }

    // High-confidence exit is always approved.
    if (

        finalDecision.source === "AIExitEngine" &&

        finalDecision.confidence >= 90

    ) {

        return true;

    }

    // Strong consensus is approved.
    if (

        consensus === CONSENSUS.VERY_HIGH ||

        consensus === CONSENSUS.HIGH

    ) {

        return true;

    }

    // Weak exits require supporting evidence.
    if (

        finalDecision.source === "AIExitEngine" &&

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

    return {

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

            finalDecision.confidence,

        source:

            finalDecision.source,

        consensus,

        conflicts,

        reasons:

            buildReasons(

                decisions,

                finalDecision,

                conflicts

            ),

        evidence:

            decisions,

        generatedAt:

            new Date(),

        engine:

            "TradeDecisionCoordinator",

        version:

            "1.0.0",

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

    context.tradeDecision =

        report;

    addDebug(

        context,

        "Trade decision coordinated.",

        {

            action:

                report.action,

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