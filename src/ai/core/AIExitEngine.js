/**
 * ==========================================================
 * AIExitEngine
 * ==========================================================
 *
 * Determines whether an active position should continue,
 * scale out, partially exit, or fully exit.
 *
 * Responsibilities
 * ----------------
 * ✔ Evaluate market health
 * ✔ Evaluate position health
 * ✔ Evaluate protection state
 * ✔ Evaluate recovery probability
 * ✔ Evaluate false exit probability
 * ✔ Evaluate emergency conditions
 * ✔ Build decision balance
 * ✔ Generate exit recommendation
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Modify stop loss
 * ✘ Modify trailing
 * ✘ Save MongoDB
 * ✘ Access Redis
 * ✘ Send notifications
 *
 * ==========================================================
 */

import {

    setExitDecision,

    addDebug,

} from "./AIContextUtils.js";

// ==========================================================
// Decisions
// ==========================================================

const DECISION = Object.freeze({

    CONTINUE: "CONTINUE",

    HOLD: "HOLD",

    SCALE_OUT: "SCALE_OUT",

    PARTIAL_EXIT: "PARTIAL_EXIT",

    FULL_EXIT: "FULL_EXIT",

});

// ==========================================================
// Urgency
// ==========================================================

const URGENCY = Object.freeze({

    LOW: "LOW",

    NORMAL: "NORMAL",

    HIGH: "HIGH",

    CRITICAL: "CRITICAL",

    IMMEDIATE: "IMMEDIATE",

});

// ==========================================================
// Helpers
// ==========================================================

function clampScore(
    value
) {

    const score =
        Number(value);

    if (

        Number.isNaN(score)

    ) {

        return 0;

    }

    return Math.max(

        0,

        Math.min(

            100,

            score

        )

    );

}

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

function getPositionHealth(
    context
) {

    return context.positionHealth ?? {};

}

function getInvestmentThesis(
    context
) {

    return context.investmentThesis ?? {};

}

// ==========================================================
// Market Health
// ==========================================================

function evaluateMarketHealth(
    context
) {

    const analyses =
        context.analyses ?? {};

    return {

        liquidity:

            clampScore(

                analyses.liquidity?.score

            ),

        momentum:

            clampScore(

                analyses.momentum?.score

            ),

        forecast:

            clampScore(

                analyses.forecast?.score

            ),

        wallets:

            clampScore(

                analyses.wallets?.score

            ),

        holders:

            clampScore(

                analyses.holders?.score

            ),

        risk:

            clampScore(

                analyses.risk?.score

            ),

    };

}

// ==========================================================
// Position Health
// ==========================================================

function evaluatePositionHealth(
    context
) {

    return getPositionHealth(
        context
    );

}

// ==========================================================
// Protection State
// ==========================================================

function evaluateProtectionState(
    context
) {

    return getProtection(
        context
    );

}

// ==========================================================
// Recovery Probability
// ==========================================================

function evaluateRecoveryProbability(
    market
) {

    const score =

        (

            market.liquidity +

            market.momentum +

            market.forecast +

            market.wallets +

            market.holders +

            (100 - market.risk)

        ) / 6;

    return Math.round(

        clampScore(score)

    );

}

// ==========================================================
// False Exit Probability
// ==========================================================

function evaluateFalseExitProbability(
    recoveryProbability
) {

    return Math.round(

        recoveryProbability * 0.9

    );

}

// ==========================================================
// Emergency Detection
// ==========================================================

function evaluateEmergencyConditions(
    protection,
    market
) {

    return Boolean(

        protection.emergencyReview?.required ||

        market.liquidity <= 20 ||

        market.momentum <= 20 ||

        market.forecast <= 20

    );

}

// ==========================================================
// Decision Balance
// ==========================================================

function buildDecisionBalance(
    context,
    market
) {

    const stayScore =

        (

            market.liquidity +

            market.momentum +

            market.forecast +

            market.wallets +

            market.holders

        ) / 5;

    const exitScore =

        (

            market.risk +

            (100 - market.momentum) +

            (100 - market.forecast)

        ) / 3;

    return {

        stayScore:

            Math.round(

                clampScore(stayScore)

            ),

        exitScore:

            Math.round(

                clampScore(exitScore)

            ),

    };

}

// ==========================================================
// Exit Thesis
// ==========================================================

function buildExitThesis(
    context,
    market,
    balance,
    recoveryProbability
) {

    const strengths = [];
    const concerns = [];
    const assumptions = [];
    const invalidation = [];

    if (market.liquidity >= 70) {

        strengths.push(
            "Liquidity remains healthy."
        );

    } else {

        concerns.push(
            "Liquidity has weakened."
        );

    }

    if (market.momentum >= 70) {

        strengths.push(
            "Momentum remains strong."
        );

    } else {

        concerns.push(
            "Momentum is deteriorating."
        );

    }

    if (market.forecast >= 70) {

        strengths.push(
            "Forecast remains bullish."
        );

    } else {

        concerns.push(
            "Forecast has weakened."
        );

    }

    assumptions.push(

        recoveryProbability >= 60

            ? "Current weakness is likely temporary."

            : "Recovery probability is limited."

    );

    invalidation.push(

        "Further liquidity deterioration."

    );

    invalidation.push(

        "Continued whale distribution."

    );

    return {

        summary:

            recoveryProbability >= 60

                ? "Current evidence favors maintaining the position."

                : "Current evidence favors preparing for an exit.",

        strengths,

        concerns,

        reasons: [

            ...strengths,

            ...concerns,

        ],

        assumptions,

        invalidation,

    };

}

// ==========================================================
// Exit Decision
// ==========================================================
function determineExitDecision(
    context,
    balance,
    emergency,
    recoveryProbability,
    falseExitProbability
) {

    const recommendation =
        getRecommendation(context);

    const protection =
        getProtection(context);

    const position =
        getPositionHealth(context);

    // ======================================================
    // Emergency overrides
    // ======================================================

    if (

        emergency &&

        protection.protectionIntent === "PREPARE_EXIT"

    ) {

        return DECISION.FULL_EXIT;

    }

    if (

        emergency &&

        position.overallHealth === "CRITICAL"

    ) {

        return DECISION.FULL_EXIT;

    }

    // ======================================================
    // Very high recovery
    // ======================================================

    if (

        recoveryProbability >= 85 &&

        falseExitProbability >= 80

    ) {

        return DECISION.CONTINUE;

    }

    // ======================================================
    // Strong bullish recommendation
    // ======================================================

    if (

        recommendation.action === "STRONG_BUY" &&

        recoveryProbability >= 70

    ) {

        return DECISION.CONTINUE;

    }

    // ======================================================
    // Decision balance
    // ======================================================

    if (

        balance.exitScore >= 85

    ) {

        return DECISION.FULL_EXIT;

    }

    if (

        balance.exitScore >= 70

    ) {

        return DECISION.PARTIAL_EXIT;

    }

    if (

        balance.exitScore >= 60

    ) {

        return DECISION.SCALE_OUT;

    }

    if (

        balance.stayScore >= 75

    ) {

        return DECISION.CONTINUE;

    }

    return DECISION.HOLD;

}
// ==========================================================
// Exit Urgency
// ==========================================================

function determineExitUrgency(
    decision,
    emergency
) {

    if (

        emergency

    ) {

        return URGENCY.IMMEDIATE;

    }

    switch (

        decision

    ) {

        case DECISION.FULL_EXIT:

            return URGENCY.CRITICAL;

        case DECISION.PARTIAL_EXIT:

            return URGENCY.HIGH;

        case DECISION.SCALE_OUT:

            return URGENCY.HIGH;

        case DECISION.HOLD:

            return URGENCY.NORMAL;

        default:

            return URGENCY.LOW;

    }

}

// ==========================================================
// Exit Confidence
// ==========================================================

function calculateExitConfidence(
    balance
) {

    return Math.round(

        Math.max(

            balance.stayScore,

            balance.exitScore

        )

    );

}

// ==========================================================
// Reasons
// ==========================================================

function buildReasons(
    market,
    emergency,
    decision
) {

    const reasons = [];

    if (

        market.liquidity < 40

    ) {

        reasons.push(

            "Liquidity is deteriorating."

        );

    }

    if (

        market.momentum < 40

    ) {

        reasons.push(

            "Momentum is weakening."

        );

    }

    if (

        market.forecast < 40

    ) {

        reasons.push(

            "Forecast has turned bearish."

        );

    }

    if (

        market.risk > 70

    ) {

        reasons.push(

            "Risk level is elevated."

        );

    }

    if (

        emergency

    ) {

        reasons.push(

            "Emergency market conditions detected."

        );

    }

    reasons.push(

        `AI recommends ${decision.replaceAll("_", " ").toLowerCase()}.`

    );

    return reasons;

}

// ==========================================================
// Exit Report
// ==========================================================

function buildExitReport(
    context
) {

    const market =

        evaluateMarketHealth(
            context
        );

    const position =

        evaluatePositionHealth(
            context
        );

    const protection =

        evaluateProtectionState(
            context
        );

    const recoveryProbability =

        evaluateRecoveryProbability(
            market
        );

    const falseExitProbability =

        evaluateFalseExitProbability(
            recoveryProbability
        );

    const emergency =

        evaluateEmergencyConditions(

            protection,

            market

        );

    const balance =

        buildDecisionBalance(

            context,

            market

        );

const decision =

    determineExitDecision(

        context,

        balance,

        emergency,

        recoveryProbability,

        falseExitProbability

    );

    return {

        decision,

        confidence:

            calculateExitConfidence(
                balance
            ),

        urgency:

            determineExitUrgency(

                decision,

                emergency

            ),

        recoveryProbability,

        falseExitProbability,

        emergency,

        exitThesis:

            buildExitThesis(

                context,

                market,

                balance,

                recoveryProbability

            ),

        evidence: {

            recommendation:

                getRecommendation(
                    context
                ),

            protection,

            position,

            investment:

                getInvestmentThesis(
                    context
                ),

            market,

            balance,

        },

        reasons:

            buildReasons(

                market,

                emergency,

                decision

            ),

        generatedAt:

            new Date(),

        engine:

            "AIExitEngine",

        version:

            "1.0.0",

    };

}

// ==========================================================
// Generate Exit Decision
// ==========================================================

export function runAIExitEngine(
    context
) {

    if (

        !context

    ) {

        throw new Error(

            "AIExitEngine: context is required."

        );

    }

    const report =

        buildExitReport(
            context
        );

    setExitDecision(

        context,

        report

    );

    addDebug(

        context,

        "AI exit decision generated.",

        {

            decision:

                report.decision,

            confidence:

                report.confidence,

            urgency:

                report.urgency,

            recoveryProbability:

                report.recoveryProbability,

            emergency:

                report.emergency,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    runAIExitEngine,

};