/**
 * ==========================================================
 * TradeManagementPlanner
 * ==========================================================
 *
 * Converts an approved AI trading decision into a detailed
 * execution plan.
 *
 * Responsibilities
 * ----------------
 * ✔ Select execution profile
 * ✔ Determine sell percentage
 * ✔ Adjust stop loss
 * ✔ Adjust trailing strategy
 * ✔ Configure protection
 * ✔ Schedule next review
 * ✔ Build execution plan
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Fetch APIs
 * ✘ Save MongoDB
 * ✘ Calculate indicators
 *
 * ==========================================================
 */

import {

    addDebug,

} from "../core/AIContextUtils.js";

// ==========================================================
// Execution Profiles
// ==========================================================

const PROFILE = Object.freeze({

    TREND_FOLLOWING:
        "TREND_FOLLOWING",

    PROFIT_PROTECTION:
        "PROFIT_PROTECTION",

    CAPITAL_PRESERVATION:
        "CAPITAL_PRESERVATION",

    EMERGENCY_EXIT:
        "EMERGENCY_EXIT",

    RECOVERY_MODE:
        "RECOVERY_MODE",

});

// ==========================================================
// Review Frequency
// ==========================================================

const REVIEW = Object.freeze({

    IMMEDIATE: 0,

    FIVE_SECONDS: 5,

    TEN_SECONDS: 10,

    FIFTEEN_SECONDS: 15,

    THIRTY_SECONDS: 30,

});

// ==========================================================
// Helpers
// ==========================================================

function getTradeDecision(
    context
) {

    return context.tradeDecision ?? {};

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

function getUserSettings(
    context
) {

    return context.userSettings ?? {};

}

// ==========================================================
// Execution Profile
// ==========================================================

function determineExecutionProfile(
    context
) {

    const decision =
        getTradeDecision(context);

    const protection =
        getProtection(context);

    switch (

        decision.action

    ) {

        case "FULL_EXIT":

            return PROFILE.EMERGENCY_EXIT;

        case "PARTIAL_EXIT":

            return PROFILE.CAPITAL_PRESERVATION;

        case "SCALE_OUT":

            return PROFILE.PROFIT_PROTECTION;

        case "CONTINUE":

        case "HOLD":

            return PROFILE.TREND_FOLLOWING;

        default:

            if (

                protection.protectionIntent ===

                "PREPARE_EXIT"

            ) {

                return PROFILE.CAPITAL_PRESERVATION;

            }

            return PROFILE.TREND_FOLLOWING;

    }

}

// ==========================================================
// Sell Percentage
// ==========================================================

function determineSellPercent(
    context,
    profile
) {

    const confidence =

        getTradeDecision(

            context

        ).confidence ?? 0;

    const settings =

        getUserSettings(

            context

        );

    let percent = 0;

    switch (profile) {

        case PROFILE.EMERGENCY_EXIT:

            percent = 100;

            break;

        case PROFILE.CAPITAL_PRESERVATION:

            percent =

                confidence >= 90

                    ? 70

                    : 50;

            break;

        case PROFILE.PROFIT_PROTECTION:

            percent =

                confidence >= 90

                    ? 25

                    : confidence >= 75

                    ? 20

                    : 10;

            break;

        default:

            percent = 0;

    }

    if (

        typeof settings.maxScaleOutPercent === "number"

    ) {

        percent = Math.min(

            percent,

            settings.maxScaleOutPercent

        );

    }

    return percent;

}

// ==========================================================
// Stop Loss Strategy
// ==========================================================

function determineStopLoss(
    profile
) {

    switch (

        profile

    ) {

        case PROFILE.PROFIT_PROTECTION:

            return "BREAK_EVEN";

        case PROFILE.CAPITAL_PRESERVATION:

            return "LOCK_PROFIT";

        case PROFILE.EMERGENCY_EXIT:

            return "DISABLED";

        default:

            return "UNCHANGED";

    }

}

// ==========================================================
// Trailing Strategy
// ==========================================================
function determineTrailing(
    context,
    profile
) {

    const confidence =

        getTradeDecision(

            context

        ).confidence ?? 0;

    switch (profile) {

        case PROFILE.TREND_FOLLOWING:

            return {

                enabled: true,

                distance:

                    confidence >= 90

                        ? 22

                        : 18,

            };

        case PROFILE.PROFIT_PROTECTION:

            return {

                enabled: true,

                distance:

                    confidence >= 90

                        ? 8

                        : 10,

            };

        case PROFILE.CAPITAL_PRESERVATION:

            return {

                enabled: true,

                distance: 6,

            };

        case PROFILE.EMERGENCY_EXIT:

            return {

                enabled: false,

                distance: null,

            };

        default:

            return {

                enabled: true,

                distance: 15,

            };

    }

}

// ==========================================================
// Protection Level
// ==========================================================

function determineProtectionLevel(
    profile
) {

    switch (

        profile

    ) {

        case PROFILE.PROFIT_PROTECTION:

            return "HIGH";

        case PROFILE.CAPITAL_PRESERVATION:

            return "MAXIMUM";

        case PROFILE.EMERGENCY_EXIT:

            return "EXIT";

        default:

            return "NORMAL";

    }

}

// ==========================================================
// TP State
// ==========================================================

function determineTPState(
    profile
) {

    switch (

        profile

    ) {

        case PROFILE.EMERGENCY_EXIT:

            return {

                disableTP: true,

            };

        default:

            return {

                disableTP: false,

            };

    }

}

// ==========================================================
// Review Schedule
// ==========================================================

function determineReviewSchedule(
    profile
) {

    switch (

        profile

    ) {

        case PROFILE.EMERGENCY_EXIT:

            return REVIEW.IMMEDIATE;

        case PROFILE.CAPITAL_PRESERVATION:

            return REVIEW.FIVE_SECONDS;

        case PROFILE.PROFIT_PROTECTION:

            return REVIEW.FIFTEEN_SECONDS;

        default:

            return REVIEW.THIRTY_SECONDS;

    }

}

// ==========================================================
// Execution Priority
// ==========================================================

function determinePriority(
    profile
) {

    switch (

        profile

    ) {

        case PROFILE.EMERGENCY_EXIT:

            return "EMERGENCY";

        case PROFILE.CAPITAL_PRESERVATION:

            return "HIGH";

        case PROFILE.PROFIT_PROTECTION:

            return "HIGH";

        default:

            return "NORMAL";

    }

}

// ==========================================================
// Execution Reason
// ==========================================================

function buildExecutionReason(
    decision,
    profile
) {

    return [

        `Execution profile: ${profile}.`,

        `AI decision: ${decision.action}.`,

        `Decision confidence: ${decision.confidence ?? 0}%.`,

        "Execution plan created and awaiting execution."

    ];

}

// ==========================================================
// Build Execution Plan
// ==========================================================

function buildExecutionPlan(
    context
) {

    const decision =

        getTradeDecision(
            context
        );

    const profile =

        determineExecutionProfile(
            context
        );

return {

    approved:

    context.execution?.approved ??

    decision.approved ??

    false,

    plannerConfidence:

        decision.confidence ?? 0,

    action:

        decision.action,

    executionProfile:

        profile,

    reason:

        buildExecutionReason(

            decision,

            profile

        ),

        sellPercent:

            determineSellPercent(

                context,

                profile

            ),

        stopLoss:

            determineStopLoss(

                profile

            ),

        trailing:

            determineTrailing(
            context,
                profile

            ),

        protectionLevel:

            determineProtectionLevel(

                profile

            ),

        tp:

            determineTPState(

                profile

            ),

        nextReview:

            determineReviewSchedule(

                profile

            ),

        priority:

    determinePriority(

        profile

    ),

executionState:

    "PENDING",

generatedAt:

    new Date(),

        engine:

            "TradeManagementPlanner",

        version:

            "1.0.0",

    };

}

// ==========================================================
// Generate Trade Management Plan
// ==========================================================

export function buildTradeManagementPlan(
    context
) {

    if (

        !context

    ) {

        throw new Error(

            "TradeManagementPlanner: context is required."

        );

    }

    const executionPlan =

        buildExecutionPlan(
            context
        );

   context.tradePlan =

    executionPlan;

    addDebug(

        context,

        "Trade management plan generated.",

        {

            action:

                executionPlan.action,

            profile:

                executionPlan.executionProfile,

            sellPercent:

                executionPlan.sellPercent,

            protection:

                executionPlan.protectionLevel,

            priority:

                executionPlan.priority,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    buildTradeManagementPlan,

};