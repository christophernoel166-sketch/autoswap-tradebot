/**
 * ==========================================================
 * RecommendationEngine
 * ==========================================================
 *
 * Single authoritative AI recommendation engine.
 *
 * Responsibilities
 * ----------------
 * ✔ Interpret the completed investment thesis
 * ✔ Determine the final trading action
 * ✔ Respect hard safety/risk blockers
 * ✔ Use momentum, forecast, wallet and historical evidence
 * ✔ Calculate conviction
 * ✔ Calculate urgency
 * ✔ Calculate actual risk level
 * ✔ Build execution hints
 * ✔ Generate recommendation explanation
 * ✔ Build recommendation scorecard
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
} from "../core/AIContextUtils.js";

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
// Generic Helpers
// ==========================================================

function safeObject(value) {

    return (
        value &&
        typeof value === "object"
    )
        ? value
        : {};

}

function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];

}

function toNumber(
    value,
    fallback = 0
) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}

function clamp(
    value,
    min = 0,
    max = 100
) {

    return Math.min(
        Math.max(
            toNumber(value),
            min
        ),
        max
    );

}

function unique(values = []) {

    return [
        ...new Set(

            safeArray(values)

                .map(
                    value =>
                        String(value).trim()
                )

                .filter(Boolean)

        ),
    ];

}

function average(values = []) {

    const numbers = values

        .map(value =>
            Number(value)
        )

        .filter(
            Number.isFinite
        );

    if (!numbers.length) {

        return 0;

    }

    return numbers.reduce(
        (sum, value) =>
            sum + value,
        0
    ) / numbers.length;

}

// ==========================================================
// Score Resolver
// ==========================================================

function getScore(
    context,
    paths = [],
    fallback = 0
) {

    for (const path of paths) {

        let value = context;

        for (
            const key
            of path.split(".")
        ) {

            value =
                value?.[key];

        }

        if (
            value !== undefined &&
            value !== null &&
            Number.isFinite(
                Number(value)
            )
        ) {

            return clamp(
                Number(value)
            );

        }

    }

    return fallback;

}

// ==========================================================
// Core Context Model
// ==========================================================

function buildAIModel(context) {

    const thesis =
        safeObject(
            context?.investmentThesis
        );

    const evidence =
        safeObject(
            context?.evidence
        );

    const analyses =
        safeObject(
            context?.analyses
        );

    const recommendation =
        safeObject(
            context?.recommendation
        );

    const validation =
        safeObject(
            context?.entryValidation
        );

    const positionHealth =
        safeObject(
            context?.positionHealth
        );

    const exitReadiness =
        safeObject(
            context?.exitReadiness
        );

    const history =
        safeObject(
            context?.history
        );

    /*
     * IMPORTANT:
     *
     * InvestmentThesisBuilder already calculates the
     * canonical weighted confidence.
     *
     * RecommendationEngine MUST NOT create another
     * confidence score from the same evidence.
     */

    const confidence =
        clamp(
            toNumber(

                thesis.confidence ??

                context?.confidence?.overall ??

                recommendation.confidence ??

                0

            )
        );

    return {

        context,

        thesis,

        evidence,

        analyses,

        recommendation,

        validation,

        positionHealth,

        exitReadiness,

        history,

        confidence,

    };

}

// ==========================================================
// Evidence Scores
// ==========================================================

function buildEvidenceScores(
    context
) {

    const analyses =
        safeObject(
            context?.analyses
        );

    const evidence =
        safeObject(
            context?.evidence
        );

    const historical =
        safeObject(
            analyses.historical ??
            evidence.historical ??
            context?.historicalPattern ??
            context?.historicalMemory
        );

    return {

        momentum:

            getScore(
                context,
                [
                    "analyses.momentum.score",
                    "analyses.momentum.momentumScore",
                    "evidence.momentum.score",
                    "evidence.momentum.momentumScore",
                ]
            ),

        forecast:

            getScore(
                context,
                [
                    "analyses.forecast.forecastScore",
                    "analyses.forecast.score",
                    "evidence.forecast.forecastScore",
                    "evidence.forecast.score",
                ]
            ),

        liquidity:

            getScore(
                context,
                [
                    "analyses.liquidity.liquidityScore",
                    "analyses.liquidity.score",
                    "evidence.liquidity.liquidityScore",
                    "evidence.liquidity.score",
                ]
            ),

        volume:

            getScore(
                context,
                [
                    "analyses.volume.volumeScore",
                    "analyses.volume.score",
                    "evidence.volume.volumeScore",
                    "evidence.volume.score",
                ]
            ),

        wallet:

            getScore(
                context,
                [
                    "analyses.wallets.score",
                    "analyses.wallets.walletScore",
                    "analyses.walletQuality.score",
                    "analyses.walletQuality.walletScore",
                    "evidence.wallets.score",
                    "evidence.wallets.walletScore",
                ]
            ),

        risk:

            getScore(
                context,
                [
                    "analyses.risk.riskScore",
                    "analyses.risk.score",
                    "evidence.risk.riskScore",
                    "evidence.risk.score",
                ]
            ),

        rugRisk:

            getScore(
                context,
                [
                    "analyses.rugRisk.score",
                    "analyses.rugRisk.rugRiskScore",
                    "analyses.rugRisk.riskScore",
                    "evidence.rugRisk.score",
                    "evidence.rugRisk.rugRiskScore",
                ]
            ),

        historicalScore:

            getScore(
                context,
                [
                    "analyses.historical.score",
                    "analyses.historical.historicalScore",
                    "evidence.historical.score",
                    "evidence.historical.historicalScore",
                ]
            ),

        historicalWinRate:

            clamp(
                toNumber(
                    historical.winRate ??
                    historical.patternWinRate ??
                    historical.stats?.winRate ??
                    0
                )
            ),

        historicalFound:

            Boolean(
                historical.found ??
                historical.patternFound ??
                historical.matchFound ??
                false
            ),

    };

}

// ==========================================================
// Detect Existing Position
// ==========================================================

function hasOpenPosition(
    context
) {

    const position =
        safeObject(
            context?.position
        );

    const positionHealth =
        context?.positionHealth;

    const exitReadiness =
        context?.exitReadiness;

    return Boolean(

        position.exists === true ||

        position.isOpen === true ||

        positionHealth ||

        exitReadiness

    );

}

// ==========================================================
// Hard Safety Check
// ==========================================================

function getSafetyDecision(
    scores,
    hasPosition
) {

    /*
     * These are hard blockers.
     *
     * A high confidence score can NEVER override
     * dangerous token safety conditions.
     */

    if (
        scores.rugRisk >= 80 ||
        scores.risk >= 90
    ) {

        return {

            blocked: true,

            action:
                hasPosition
                    ? ACTIONS.FULL_EXIT
                    : ACTIONS.AVOID,

            reason:
                "Critical token risk detected.",

        };

    }

    if (
        scores.liquidity > 0 &&
        scores.liquidity < 20
    ) {

        return {

            blocked: true,

            action:
                hasPosition
                    ? ACTIONS.FULL_EXIT
                    : ACTIONS.AVOID,

            reason:
                "Liquidity is below the minimum safety threshold.",

        };

    }

    if (
        scores.wallet > 0 &&
        scores.wallet < 20
    ) {

        return {

            blocked: true,

            action:
                hasPosition
                    ? ACTIONS.FULL_EXIT
                    : ACTIONS.AVOID,

            reason:
                "Wallet quality is below the minimum safety threshold.",

        };

    }

    return {

        blocked: false,

        action: null,

        reason: null,

    };

}

// ==========================================================
// Action
// ==========================================================

function calculateAction(
    context,
    confidence,
    scores
) {

    const hasPosition =
        hasOpenPosition(
            context
        );

    // ======================================================
    // Existing Position
    // ======================================================

    if (hasPosition) {

        const exitReadiness =
            context?.exitReadiness;

        const positionHealth =
            context?.positionHealth;

        if (
            exitReadiness ===
            "EXIT_NOW"
        ) {

            return ACTIONS.FULL_EXIT;

        }

        if (
            exitReadiness ===
            "PREPARE_EXIT"
        ) {

            return ACTIONS.PARTIAL_EXIT;

        }

        if (
            positionHealth ===
            "CRITICAL"
        ) {

            return ACTIONS.FULL_EXIT;

        }

        if (
            positionHealth ===
            "WEAK"
        ) {

            return ACTIONS.REDUCE;

        }

        if (
            scores.risk >= 90 ||
            scores.rugRisk >= 80
        ) {

            return ACTIONS.FULL_EXIT;

        }

        /*
         * Existing position with healthy conditions.
         */

        if (
            confidence >= 80
        ) {

            return ACTIONS.HOLD;

        }

        if (
            confidence >= 60
        ) {

            return ACTIONS.HOLD;

        }

        if (
            confidence >= 40
        ) {

            return ACTIONS.REDUCE;

        }

        return ACTIONS.FULL_EXIT;

    }

    // ======================================================
    // New Entry
    // ======================================================

    /*
     * Strong Buy
     *
     * Requires agreement between:
     *
     * - canonical confidence
     * - historical edge
     * - wallet quality
     * - momentum
     * - forecast
     */

    if (

        confidence >= 90 &&

        scores.historicalFound &&

        scores.historicalWinRate >= 70 &&

        scores.wallet >= 80 &&

        scores.momentum >= 80 &&

        scores.forecast >= 85

    ) {

        return ACTIONS.STRONG_BUY;

    }

    /*
     * Buy
     */

    if (

        confidence >= 80 &&

        scores.wallet >= 60 &&

        scores.momentum >= 60 &&

        scores.forecast >= 70

    ) {

        return ACTIONS.BUY;

    }

    /*
     * Accumulate
     *
     * Moderate/high confidence but not enough
     * confirmation for a full BUY.
     */

    if (

        confidence >= 65 &&

        scores.momentum >= 50 &&

        scores.forecast >= 50

    ) {

        return ACTIONS.ACCUMULATE;

    }

    /*
     * Watch
     */

    if (
        confidence >= 35
    ) {

        return ACTIONS.WATCH;

    }

    return ACTIONS.AVOID;

}

// ==========================================================
// Conviction
// ==========================================================

function calculateConviction(
    confidence
) {

    confidence =
        clamp(
            confidence
        );

    if (
        confidence >= 95
    ) {

        return CONVICTION.VERY_HIGH;

    }

    if (
        confidence >= 80
    ) {

        return CONVICTION.HIGH;

    }

    if (
        confidence >= 65
    ) {

        return CONVICTION.MODERATE;

    }

    if (
        confidence >= 45
    ) {

        return CONVICTION.LOW;

    }

    return CONVICTION.VERY_LOW;

}

// ==========================================================
// Actual Risk Level
// ==========================================================

function calculateRisk(
    riskScore
) {

    /*
     * IMPORTANT:
     *
     * Risk is now calculated from ACTUAL RISK SCORE,
     * not from confidence.
     *
     * High risk score = dangerous.
     */

    riskScore =
        clamp(
            riskScore
        );

    if (
        riskScore <= 10
    ) {

        return RISK.VERY_LOW;

    }

    if (
        riskScore <= 25
    ) {

        return RISK.LOW;

    }

    if (
        riskScore <= 50
    ) {

        return RISK.MEDIUM;

    }

    if (
        riskScore <= 75
    ) {

        return RISK.HIGH;

    }

    return RISK.EXTREME;

}

// ==========================================================
// Urgency
// ==========================================================

function calculateUrgency(
    action
) {

    switch (action) {

        case ACTIONS.FULL_EXIT:

            return URGENCY.CRITICAL;

        case ACTIONS.PARTIAL_EXIT:

        case ACTIONS.REDUCE:

            return URGENCY.HIGH;

        case ACTIONS.STRONG_BUY:

        case ACTIONS.BUY:

            return URGENCY.HIGH;

        case ACTIONS.WATCH:

            return URGENCY.NORMAL;

        default:

            return URGENCY.NORMAL;

    }

}

// ==========================================================
// Execution Hints
// ==========================================================

function buildExecutionHints(
    action,
    context,
    confidence
) {

    const urgency =
        calculateUrgency(
            action
        );

    return {

        shouldBuy:

            [
                ACTIONS.BUY,
                ACTIONS.STRONG_BUY,
                ACTIONS.ACCUMULATE,
            ].includes(action),

        shouldSell:

            [
                ACTIONS.PARTIAL_EXIT,
                ACTIONS.FULL_EXIT,
            ].includes(action),

        shouldReduce:

            action === ACTIONS.REDUCE,

        shouldExit:

            action === ACTIONS.FULL_EXIT,

        shouldMonitor:

            ![
                ACTIONS.FULL_EXIT,
                ACTIONS.AVOID,
            ].includes(action),

        confidence,

        urgency,

        allowScalingIn:

            confidence >= 85 &&
            [
                ACTIONS.BUY,
                ACTIONS.STRONG_BUY,
                ACTIONS.ACCUMULATE,
            ].includes(action),

        allowPartialTakeProfit:

            confidence >= 70,

        requiresConfirmation:

            [
                ACTIONS.WATCH,
                ACTIONS.ACCUMULATE,
            ].includes(action),

        cooldownMinutes:

            urgency === URGENCY.CRITICAL
                ? 0
                : urgency === URGENCY.HIGH
                    ? 2
                    : urgency === URGENCY.NORMAL
                        ? 5
                        : 10,

    };

}

// ==========================================================
// Explanation
// ==========================================================

function buildExplanation({

    thesis = {},

    action,

    confidence,

    conviction,

    riskLevel,

    safetyReason,

    scores = {},

}) {

    const positives =
        unique(
            thesis.strengths
        );

    const negatives =
        unique(
            thesis.weaknesses
        );

    const risks =
        unique(
            thesis.risks
        );

    const assumptions =
        unique(
            thesis.assumptions
        );

    const convictionDrivers =
        unique(
            thesis.convictionDrivers
        );

    const monitoringPriorities =
        unique(
            thesis.monitoringPriorities
        );

    const conditions = [];

    if (
        scores.momentum >= 70
    ) {

        conditions.push(
            "Strong momentum."
        );

    }

    if (
        scores.forecast >= 70
    ) {

        conditions.push(
            "Bullish forecast."
        );

    }

    if (
        scores.wallet >= 70
    ) {

        conditions.push(
            "Strong wallet quality."
        );

    }

    if (
        scores.historicalFound &&
        scores.historicalWinRate >= 70
    ) {

        conditions.push(
            "Historical pattern has a strong win rate."
        );

    }

    if (
        scores.liquidity >= 50
    ) {

        conditions.push(
            "Liquidity is supportive."
        );

    }

    if (
        scores.volume >= 60
    ) {

        conditions.push(
            "Volume confirms participation."
        );

    }

    if (safetyReason) {

        risks.unshift(
            safetyReason
        );

    }

    return {

        summary:
            String(
                thesis.summary || ""
            ).trim(),

        recommendation:
            action,

        confidence,

        conviction,

        riskLevel,

        positives,

        negatives,

        risks:
            unique(risks),

        assumptions,

        convictionDrivers,

        conditions:
            unique(conditions),

        monitoringPriorities,

        positivesCount:
            positives.length,

        negativesCount:
            negatives.length,

        riskCount:
            unique(risks).length,

    };

}

// ==========================================================
// Scorecard
// ==========================================================

function buildScorecard(
    context,
    confidence,
    scores,
    consensus
) {

    return {

        confidence:
            clamp(
                confidence
            ),

        liquidity:
            scores.liquidity,

        volume:
            scores.volume,

        momentum:
            scores.momentum,

        wallets:
            scores.wallet,

        holders:
            getScore(
                context,
                [
                    "analyses.holders.score",
                    "evidence.holders.score",
                ]
            ),

        chart:
            getScore(
                context,
                [
                    "analyses.chart.score",
                    "evidence.chart.score",
                ]
            ),

        forecast:
            scores.forecast,

        risk:
            scores.risk,

        rugRisk:
            scores.rugRisk,

        historical:
            scores.historicalScore,

        walletQuality:
            getScore(
                context,
                [
                    "analyses.walletQuality.score",
                    "evidence.walletQuality.score",
                ]
            ) || scores.wallet,

        holderDistribution:
            getScore(
                context,
                [
                    "analyses.holderDistribution.score",
                    "evidence.holderDistribution.score",
                ]
            ),

        riskStructure:
            getScore(
                context,
                [
                    "analyses.riskStructure.score",
                    "evidence.riskStructure.score",
                ]
            ),

        consensus,

    };

}

// ==========================================================
// Consensus
// ==========================================================

function buildConsensus(
    context,
    confidence
) {

    const evidence =
        safeObject(
            context?.evidence
        );

    const engines =
        Object.entries(
            evidence
        )

            .map(
                ([name, value]) => ({

                    name,

                    ...safeObject(
                        value
                    ),

                })
            )

            .filter(
                engine =>
                    Number.isFinite(
                        Number(
                            engine.confidenceContribution
                        )
                    )
            );

    if (!engines.length) {

        return {

            score:
                confidence,

            agreement:
                100,

            disagreement:
                0,

            engineCount:
                0,

            unanimous:
                true,

        };

    }

    const scores =
        engines.map(
            engine =>
                clamp(
                    toNumber(
                        engine.confidenceContribution
                    )
                )
        );

    const consensusScore =
        Math.round(
            average(scores)
        );

    const agreementRatio =
        Math.round(

            (

                engines.filter(
                    engine =>

                        Math.abs(

                            toNumber(
                                engine.confidenceContribution
                            ) -
                            confidence

                        ) <= 10

                ).length /

                engines.length

            ) * 100

        );

    return {

        score:
            consensusScore,

        agreement:
            agreementRatio,

        disagreement:
            100 - agreementRatio,

        engineCount:
            engines.length,

        unanimous:
            agreementRatio >= 90,

    };

}

// ==========================================================
// Recommendation Builder
// ==========================================================

function buildRecommendation(
    context
) {

    const ai =
        buildAIModel(
            context
        );

    const confidence =
        ai.confidence;

    const scores =
        buildEvidenceScores(
            context
        );

    const safety =
        getSafetyDecision(
            scores,
            hasOpenPosition(
                context
            )
        );

    const action =
        safety.blocked
            ? safety.action
            : calculateAction(
                context,
                confidence,
                scores
            );

    const conviction =
        calculateConviction(
            confidence
        );

    const riskLevel =
        calculateRisk(
            scores.risk
        );

    const urgency =
        calculateUrgency(
            action
        );

    const consensus =
        buildConsensus(
            context,
            confidence
        );

    const explanation =
        buildExplanation({

            thesis:
                ai.thesis,

            action,

            confidence,

            conviction,

            riskLevel,

            safetyReason:
                safety.reason,

            scores,

        });

    const scorecard =
        buildScorecard(
            context,
            confidence,
            scores,
            consensus
        );

    const execution =
        buildExecutionHints(
            action,
            context,
            confidence
        );

    /*
     * Preserve the useful output contract already
     * used by the rest of the AI architecture.
     */

    return {

        action,

        /*
         * Compatibility alias.
         *
         * Some existing consumers may read
         * recommendation instead of action.
         */

        recommendation:
            action,

        confidence,

        conviction,

        urgency,

        riskLevel,

        explanation,

        scorecard,

        execution,

        generatedAt:
            new Date(),

        engine:
            "RecommendationEngine",

        version:
            "3.0.0",

        timestamp:
            Date.now(),

        /*
         * The thesis confidence is the canonical
         * confidence source.
         *
         * We deliberately DO NOT calculate another
         * confidence by averaging the same evidence.
         */

        thesisConfidence:
            confidence,

        overallConfidence:
            confidence,

        confidenceBreakdown: {

            thesis:
                confidence,

            final:
                confidence,

        },

        consensus,

        strengths:
            unique(
                ai.thesis.strengths
            ),

        weaknesses:
            unique(
                ai.thesis.weaknesses
            ),

        risks:
            unique(
                ai.thesis.risks
            ),

        assumptions:
            unique(
                ai.thesis.assumptions
            ),

        convictionDrivers:
            unique(
                ai.thesis.convictionDrivers
            ),

        monitoringPriorities:
            unique(
                ai.thesis.monitoringPriorities
            ),

        metrics: {

            positiveSignals:
                unique(
                    ai.thesis.strengths
                ).length,

            warningSignals:
                unique(
                    ai.thesis.weaknesses
                ).length,

            riskSignals:
                unique(
                    ai.thesis.risks
                ).length,

            convictionSignals:
                unique(
                    ai.thesis.convictionDrivers
                ).length,

            monitoringSignals:
                unique(
                    ai.thesis.monitoringPriorities
                ).length,

        },

        decisionBasis: {

            confidence,

            momentum:
                scores.momentum,

            forecast:
                scores.forecast,

            liquidity:
                scores.liquidity,

            volume:
                scores.volume,

            wallet:
                scores.wallet,

            historicalScore:
                scores.historicalScore,

            historicalFound:
                scores.historicalFound,

            historicalWinRate:
                scores.historicalWinRate,

            risk:
                scores.risk,

            rugRisk:
                scores.rugRisk,

            safetyBlocked:
                safety.blocked,

        },

    };

}

// ==========================================================
// Public API
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

            safetyBlocked:
                recommendation
                    .decisionBasis
                    .safetyBlocked,

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