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

    const recommendation =
        context.recommendation ??
        context.tradeDecision?.recommendation ??
        {};

    if (
        typeof recommendation === "string"
    ) {

        return {

            recommendation,

            action:
                recommendation,

        };

    }

    return {

        ...recommendation,

        recommendation:
            recommendation.recommendation ??
            recommendation.action ??
            null,

        action:
            recommendation.action ??
            recommendation.recommendation ??
            null,

        confidence:
            Number(
                recommendation.confidence ??
                0
            ),

    };

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
// Original Entry AI Snapshot
// ==========================================================
//
// Reads the immutable AI state that existed when the
// position was opened.
//
// IMPORTANT
// ---------
// This does NOT make an exit decision.
// It only exposes the original entry intelligence so the
// exit engine can compare it with the current position.
//
// ==========================================================

function getEntrySnapshot(
    context
) {

    const snapshot =
        context?.entrySnapshot ?? null;


    if (
        !snapshot ||
        typeof snapshot !== "object"
    ) {

        return {

            exists: false,

            thesis: null,

            recommendation: null,

            entryValidation: null,

            tradeDecision: null,

            confidence: null,

            evidence: null,

            analyses: null,

            execution: null,

        };

    }


    return {

        exists: true,

        thesis:
            snapshot.thesis ??
            null,

        recommendation:
            snapshot.recommendation ??
            null,

        entryValidation:
            snapshot.entryValidation ??
            null,

        tradeDecision:
            snapshot.tradeDecision ??
            null,

        confidence:
            snapshot.confidence ??
            null,

        evidence:
            snapshot.evidence ??
            null,

        analyses:
            snapshot.analyses ??
            null,

        execution:
            snapshot.execution ??
            null,

    };

}

// ==========================================================
// Entry Baseline
// ==========================================================
//
// Extracts the immutable market state captured when the
// position was opened.
//
// This is measurement only.
// It does NOT make an exit decision.
//
// ==========================================================

function getEntryBaseline(context) {

    const snapshot =
        getEntrySnapshot(context);

    const execution =
        snapshot.execution ?? {};

    const analyses =
        snapshot.analyses ?? {};

    const market =
        analyses.market ?? {};

    const metrics =
        market.metrics ?? {};

    return {

        price:
            Number(
                execution.entryPrice ??
                snapshot.entryPrice ??
                0
            ),

        marketCap:
            Number(
                metrics.marketCapUsd ??
                metrics.marketCap ??
                0
            ),

        liquidity:
            Number(
                metrics.liquidityUsd ??
                metrics.liquidity ??
                0
            ),

    };

}


// ==========================================================
// Current Market Baseline
// ==========================================================
//
// Extracts the latest live market state supplied by the
// position monitor.
//
// Priority:
// 1. currentMarketSnapshot
// 2. current context/request values
//
// This function does NOT call DexScreener.
// The monitor already supplies the live snapshot.
//
// ==========================================================

function getCurrentMarketBaseline(context) {

    const snapshot =
        context?.currentMarketSnapshot ??
        context?.request?.currentMarketSnapshot ??
        null;

    const analyses =
        context?.analyses ?? {};

    const market =
        analyses.market ?? {};

    const metrics =
        market.metrics ?? {};

    const currentPrice =
        Number(
            snapshot?.priceUsd ??
            context?.currentPrice ??
            context?.request?.currentPrice ??
            0
        );

    const currentMarketCap =
        Number(
            snapshot?.marketCapUsd ??
            metrics.marketCapUsd ??
            metrics.marketCap ??
            0
        );

    const currentLiquidity =
        Number(
            snapshot?.liquidityUsd ??
            metrics.liquidityUsd ??
            metrics.liquidity ??
            0
        );

    return {

        price:
            Number.isFinite(currentPrice) &&
            currentPrice > 0
                ? currentPrice
                : null,

        marketCap:
            Number.isFinite(currentMarketCap) &&
            currentMarketCap > 0
                ? currentMarketCap
                : null,

        liquidity:
            Number.isFinite(currentLiquidity) &&
            currentLiquidity > 0
                ? currentLiquidity
                : null,

    };

}


// ==========================================================
// Percent Change
// ==========================================================
//
// Calculates percentage movement from the original value
// to the current value.
//
// Returns null when a valid comparison cannot be made.
//
// ==========================================================

function calculatePercentChange(
    original,
    current
) {

    const originalValue =
        Number(original);

    const currentValue =
        Number(current);

    if (
        !Number.isFinite(originalValue) ||
        !Number.isFinite(currentValue) ||
        originalValue <= 0
    ) {

        return null;

    }

    return Number(
        (
            (
                currentValue -
                originalValue
            ) /
            originalValue
        ) *
        100
    );

}


// ==========================================================
// Entry Thesis Trajectory
// ==========================================================
//
// Compares the original entry market state against the
// current live market state.
//
// This function measures trajectory only.
// It does NOT decide whether to exit.
//
// ==========================================================

function evaluateEntryThesisTrajectory(
    context
) {

    const entry =
        getEntryBaseline(context);

    const current =
        getCurrentMarketBaseline(context);

    const priceChangePct =
        calculatePercentChange(
            entry.price,
            current.price
        );

    const marketCapChangePct =
        calculatePercentChange(
            entry.marketCap,
            current.marketCap
        );

    const liquidityChangePct =
        calculatePercentChange(
            entry.liquidity,
            current.liquidity
        );

    const analyses =
        context?.analyses ?? {};

    const momentumScore =
        clampScore(
            analyses.momentum?.score
        );

    const forecastScore =
        clampScore(
            analyses.forecast?.forecastScore ??
            analyses.forecast?.score
        );

    const hasPriceComparison =
        priceChangePct !== null;

    const hasMarketCapComparison =
        marketCapChangePct !== null;

    const hasLiquidityComparison =
        liquidityChangePct !== null;

    const strengtheningSignals = [];

    const weakeningSignals = [];

    // ------------------------------------------------------
    // Price trajectory
    // ------------------------------------------------------

    if (
        hasPriceComparison &&
        priceChangePct > 0
    ) {

        strengtheningSignals.push(
            "Price is above the original entry level."
        );

    } else if (
        hasPriceComparison &&
        priceChangePct < 0
    ) {

        weakeningSignals.push(
            "Price is below the original entry level."
        );

    }


    // ------------------------------------------------------
    // Market-cap trajectory
    // ------------------------------------------------------

    if (
        hasMarketCapComparison &&
        marketCapChangePct > 0
    ) {

        strengtheningSignals.push(
            "Market cap is above the original entry level."
        );

    } else if (
        hasMarketCapComparison &&
        marketCapChangePct < 0
    ) {

        weakeningSignals.push(
            "Market cap is below the original entry level."
        );

    }


    // ------------------------------------------------------
    // Liquidity trajectory
    // ------------------------------------------------------

    if (
        hasLiquidityComparison &&
        liquidityChangePct > 0
    ) {

        strengtheningSignals.push(
            "Liquidity is above the original entry level."
        );

    } else if (
        hasLiquidityComparison &&
        liquidityChangePct < 0
    ) {

        weakeningSignals.push(
            "Liquidity is below the original entry level."
        );

    }


    // ------------------------------------------------------
    // Current momentum
    // ------------------------------------------------------

    if (
        momentumScore >= 70
    ) {

        strengtheningSignals.push(
            "Current momentum remains strong."
        );

    } else if (
        momentumScore > 0 &&
        momentumScore < 40
    ) {

        weakeningSignals.push(
            "Current momentum is weak."
        );

    }


    // ------------------------------------------------------
    // Current forecast
    // ------------------------------------------------------

    if (
        forecastScore >= 70
    ) {

        strengtheningSignals.push(
            "Current forecast remains strong."
        );

    } else if (
        forecastScore > 0 &&
        forecastScore < 40
    ) {

        weakeningSignals.push(
            "Current forecast has weakened."
        );

    }


    // ------------------------------------------------------
    // Determine trajectory
    // ------------------------------------------------------

    let status = "STABLE";

    const strengtheningCount =
        strengtheningSignals.length;

    const weakeningCount =
        weakeningSignals.length;

    if (
        weakeningCount >= 3 &&
        strengtheningCount === 0
    ) {

        status = "INVALIDATED";

    } else if (
        strengtheningCount >= 3 &&
        strengtheningCount > weakeningCount
    ) {

        status = "STRENGTHENING";

    } else if (
        weakeningCount >= 2 &&
        weakeningCount > strengtheningCount
    ) {

        status = "WEAKENING";

    }


    return {

        status,

        price: {

            entry:
                entry.price || null,

            current:
                current.price,

            changePercent:
                priceChangePct,

        },

        marketCap: {

            entry:
                entry.marketCap || null,

            current:
                current.marketCap,

            changePercent:
                marketCapChangePct,

        },

        liquidity: {

            entry:
                entry.liquidity || null,

            current:
                current.liquidity,

            changePercent:
                liquidityChangePct,

        },

        momentum:
            momentumScore,

        forecast:
            forecastScore,

        strengtheningSignals,

        weakeningSignals,

        comparisonAvailable: {

            price:
                hasPriceComparison,

            marketCap:
                hasMarketCapComparison,

            liquidity:
                hasLiquidityComparison,

        },

    };

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

                analyses.forecast?.forecastScore ??
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

                analyses.risk?.riskScore ??
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
    falseExitProbability,
    thesisTrajectory
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
    //
    // Emergency protection always has priority.
    //
    // Thesis trajectory must NEVER suppress a genuine
    // emergency condition.
    //
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
    // Thesis trajectory
    // ======================================================

    const trajectory =
        thesisTrajectory?.status ??
        "STABLE";


    // ======================================================
    // Invalidated thesis
    // ======================================================
    //
    // If the original entry thesis has materially broken
    // across multiple dimensions, the position should not
    // blindly remain open simply because a current score
    // happens to look acceptable.
    //
    // ======================================================

    if (

        trajectory === "INVALIDATED" &&

        balance.exitScore >= 60

    ) {

        return DECISION.FULL_EXIT;

    }


    // ======================================================
    // Strengthening thesis
    // ======================================================
    //
    // If the original thesis is strengthening and price is
    // still positive, avoid premature profit-taking.
    //
    // This is especially important at TP checkpoints:
    //
    // TP1 reached
    //      ↓
    // Thesis strengthening
    //      ↓
    // CONTINUE toward TP2
    //
    // ======================================================

    if (

        trajectory === "STRENGTHENING" &&

        thesisTrajectory?.price?.changePercent > 0 &&

        recoveryProbability >= 70

    ) {

        return DECISION.CONTINUE;

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
    // Weakening thesis
    // ======================================================
    //
    // A weakening thesis makes the existing exit balance
    // more important.
    //
    // We intentionally do not force a full exit here.
    // The existing balance determines the severity.
    //
    // ======================================================

    if (

        trajectory === "WEAKENING"

    ) {

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

const thesisTrajectory =

    evaluateEntryThesisTrajectory(
        context
    );

const decision =

    determineExitDecision(

        context,

        balance,

        emergency,

        recoveryProbability,

        falseExitProbability,

        thesisTrajectory

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

    thesisTrajectory,

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