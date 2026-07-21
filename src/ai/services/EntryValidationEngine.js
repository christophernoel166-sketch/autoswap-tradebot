/**
 * ==========================================================
 * EntryValidationEngine
 * ==========================================================
 *
 * Validates whether a newly opened position is proving
 * the original investment thesis correct.
 *
 * Responsibilities
 * ----------------
 * ✔ Validate breakout
 * ✔ Validate liquidity
 * ✔ Validate momentum
 * ✔ Validate wallet behaviour
 * ✔ Validate holder behaviour
 * ✔ Validate confidence trend
 * ✔ Detect fake breakouts
 * ✔ Detect early weakness
 * ✔ Recommend lifecycle transition
 * ✔ Explain every decision
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Modify stop loss
 * ✘ Modify trailing stop
 * ✘ Save MongoDB
 * ✘ Access Redis
 * ✘ Fetch APIs
 * ✘ Send notifications
 *
 * ==========================================================
 */

import {

    setEntryValidation,

    addDebug,

} from "../core/AIContextUtils.js";

// ==========================================================
// Constants
// ==========================================================

const VALIDATION = Object.freeze({

    CONTINUE_VALIDATING:
        "CONTINUE_VALIDATING",

    ENTRY_CONFIRMED:
        "ENTRY_CONFIRMED",

    ENTRY_WEAKENING:
        "ENTRY_WEAKENING",

    ENTRY_INVALIDATED:
        "ENTRY_INVALIDATED",

    REVIEW_REQUIRED:
        "REVIEW_REQUIRED",

});

const TREND = Object.freeze({

    IMPROVING:
        "IMPROVING",

    STABLE:
        "STABLE",

    WEAKENING:
        "WEAKENING",

});

const LIFECYCLE = Object.freeze({

    VALIDATING:
        "VALIDATING",

    GROWING:
        "GROWING",

    EXIT_PREPARATION:
        "EXIT_PREPARATION",

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

function normalizeReasons(
    reasons = []
) {

    if (
        !Array.isArray(reasons)
    ) {

        return [];

    }

    return reasons

        .filter(Boolean)

        .map(

            reason =>

                String(reason).trim()

        )

        .filter(Boolean);

}

function buildEvaluation({

    score = 0,

    confidence = 0,

    trend = TREND.STABLE,

    passed = false,

    reasons = [],

}) {

    return {

        score:

            clampScore(
                score
            ),

        confidence:

            clampScore(
                confidence
            ),

        trend,

        passed,

        reasons:

            normalizeReasons(
                reasons
            ),

    };

}

// ==========================================================
// Individual Evaluators
// ==========================================================

function evaluateLiquidity(
    context
) {

    const analysis =
        context?.analyses?.liquidity;

    const score =
        clampScore(
            analysis?.score
        );

    return buildEvaluation({

        score,

        confidence:
            score,

        trend:

            score >= 70

                ? TREND.IMPROVING

                : score >= 50

                ? TREND.STABLE

                : TREND.WEAKENING,

        passed:
            score >= 60,

        reasons:

            analysis?.reasons ||

            [],

    });

}

function evaluateMomentum(
    context
) {

    const analysis =
        context?.analyses?.momentum;

    const score =
        clampScore(
            analysis?.score
        );

    return buildEvaluation({

        score,

        confidence:
            score,

        trend:

            score >= 70

                ? TREND.IMPROVING

                : score >= 50

                ? TREND.STABLE

                : TREND.WEAKENING,

        passed:
            score >= 60,

        reasons:

            analysis?.reasons ||

            [],

    });

}

function evaluateWallets(
    context
) {

    const analysis =
        context?.analyses?.wallets;

    const score =
        clampScore(
            analysis?.score
        );

    return buildEvaluation({

        score,

        confidence:
            score,

        trend:

            score >= 70

                ? TREND.IMPROVING

                : score >= 50

                ? TREND.STABLE

                : TREND.WEAKENING,

        passed:
            score >= 60,

        reasons:

            analysis?.reasons ||

            [],

    });

}

function evaluateHolders(
    context
) {

    const analysis =
        context?.analyses?.holders;

    const score =
        clampScore(
            analysis?.score
        );

    return buildEvaluation({

        score,

        confidence:
            score,

        trend:

            score >= 70

                ? TREND.IMPROVING

                : score >= 50

                ? TREND.STABLE

                : TREND.WEAKENING,

        passed:
            score >= 60,

        reasons:

            analysis?.reasons ||

            [],

    });

}

function evaluateChart(
    context
) {

    const analysis =
        context?.analyses?.chart;

    const score =
        clampScore(
            analysis?.score
        );

    return buildEvaluation({

        score,

        confidence:
            score,

        trend:

            score >= 70

                ? TREND.IMPROVING

                : score >= 50

                ? TREND.STABLE

                : TREND.WEAKENING,

        passed:
            score >= 60,

        reasons:

            analysis?.reasons ||

            [],

    });

}

function evaluateForecast(
    context
) {

    const analysis =
        context?.analyses?.forecast;

    const score =
    clampScore(
        analysis?.forecastScore ??
        analysis?.score
    );

    return buildEvaluation({

        score,

        confidence:
            score,

        trend:

            score >= 70

                ? TREND.IMPROVING

                : score >= 50

                ? TREND.STABLE

                : TREND.WEAKENING,

        passed:
            score >= 60,

        reasons:

            analysis?.reasons ||

            [],

    });

}

function evaluateRisk(
    context
) {

    const analysis =
        context?.analyses?.risk;

    const score =
    clampScore(
        analysis?.riskScore ??
        analysis?.score
    );

    return buildEvaluation({

        score,

        confidence:
            100 - score,

        trend:

            score <= 30

                ? TREND.IMPROVING

                : score <= 60

                ? TREND.STABLE

                : TREND.WEAKENING,

        passed:
            score <= 40,

        reasons:

            analysis?.reasons ||

            [],

    });

}

// ==========================================================
// Confidence Calculation
// ==========================================================

function calculateValidationConfidence(
    evaluations
) {

    const WEIGHTS = Object.freeze({

        liquidity: 0.20,

        momentum: 0.20,

        chart: 0.20,

        forecast: 0.15,

        wallets: 0.15,

        holders: 0.05,

        risk: 0.05,

    });

    let weightedTotal = 0;

    let totalWeight = 0;

    for (

        const [

            key,

            evaluation

        ] of Object.entries(

            evaluations

        )

    ) {

        const weight =

            WEIGHTS[key] ?? 0;

        weightedTotal +=

            evaluation.confidence *

            weight;

        totalWeight +=

            weight;

    }

    if (

        totalWeight <= 0

    ) {

        return 0;

    }

    return Math.round(

        weightedTotal /

        totalWeight

    );

}

// ==========================================================
// Validation Status
// ==========================================================

function determineValidationStatus(
    confidence,
    evaluations
) {

    const passed =
        Object.values(
            evaluations
        ).filter(

            evaluation =>

                evaluation.passed

        ).length;

   if (

    confidence >= 85 &&

    passed >= 6 &&

    evaluations.risk.passed

) {

    return VALIDATION.ENTRY_CONFIRMED;

}

    if (

        confidence >= 60 &&

        passed >= 5

    ) {

        return VALIDATION.CONTINUE_VALIDATING;

    }

    if (

        confidence >= 40

    ) {

        return VALIDATION.ENTRY_WEAKENING;

    }

    if (

        confidence >= 25

    ) {

        return VALIDATION.REVIEW_REQUIRED;

    }

    return VALIDATION.ENTRY_INVALIDATED;

}

// ==========================================================
// Lifecycle Recommendation
// ==========================================================

function determineLifecycleState(
    validationStatus
) {

    switch (

        validationStatus

    ) {

        case VALIDATION.ENTRY_CONFIRMED:

            return LIFECYCLE.GROWING;

        case VALIDATION.ENTRY_INVALIDATED:

            return LIFECYCLE.EXIT_PREPARATION;

        default:

            return LIFECYCLE.VALIDATING;

    }

}

// ==========================================================
// Evidence Builder
// ==========================================================

function buildEvidence(
    evaluations
) {

    return {

        liquidity:

            evaluations.liquidity.score,

        momentum:

            evaluations.momentum.score,

        wallets:

            evaluations.wallets.score,

        holders:

            evaluations.holders.score,

        chart:

            evaluations.chart.score,

        forecast:

            evaluations.forecast.score,

        risk:

            evaluations.risk.score,

    };

}

// ==========================================================
// Reason Builder
// ==========================================================

function buildReasons(
    evaluations
) {

    return [

        ...new Set(

            Object.values(

                evaluations

            )

                .flatMap(

                    evaluation =>

                        evaluation.reasons

                )

                .filter(Boolean)

        ),

    ];

}

// ==========================================================
// Validation Report
// ==========================================================

function buildValidationReport(
    context
) {

    const evaluations = {

        liquidity:

            evaluateLiquidity(
                context
            ),

        momentum:

            evaluateMomentum(
                context
            ),

        wallets:

            evaluateWallets(
                context
            ),

        holders:

            evaluateHolders(
                context
            ),

        chart:

            evaluateChart(
                context
            ),

        forecast:

            evaluateForecast(
                context
            ),

        risk:

            evaluateRisk(
                context
            ),

    };

    const confidence =

        calculateValidationConfidence(

            evaluations

        );

    const validationStatus =

        determineValidationStatus(

            confidence,

            evaluations

        );

    const trendValues =

        Object.values(

            evaluations

        ).map(

            evaluation =>

                evaluation.trend

        );

    let trend =
        TREND.STABLE;

    if (

        trendValues.filter(

            value =>

                value ===

                TREND.IMPROVING

        ).length >= 4

    ) {

        trend =
            TREND.IMPROVING;

    }

    else if (

        trendValues.filter(

            value =>

                value ===

                TREND.WEAKENING

        ).length >= 4

    ) {

        trend =
            TREND.WEAKENING;

    }

    return {

        validationStatus,

        confidence,

        trend,

        reasons:

            buildReasons(

                evaluations

            ),

        evidence:

            buildEvidence(

                evaluations

            ),

        nextLifecycleState:

            determineLifecycleState(

                validationStatus

            ),

        generatedAt:

            new Date(),

        engine:

            "EntryValidationEngine",

        version:

            "1.0.0",

    };

}

// ==========================================================
// Generate Entry Validation
// ==========================================================

export function runEntryValidationEngine(
    context
) {

    if (!context) {

        throw new Error(

            "EntryValidationEngine: context is required."

        );

    }

    const validation =

        buildValidationReport(
            context
        );

    setEntryValidation(

        context,

        validation

    );

    addDebug(

        context,

        "Entry validation completed.",

        {

            status:

                validation.validationStatus,

            confidence:

                validation.confidence,

            trend:

                validation.trend,

            lifecycle:

                validation.nextLifecycleState,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    runEntryValidationEngine,

};