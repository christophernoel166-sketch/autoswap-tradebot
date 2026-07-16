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

function safeObject(value) {

    return value &&
        typeof value === "object"
        ? value
        : {};

}

function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];

}

function toNumber(value, fallback = 0) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;

}

function clamp(value, min = 0, max = 100) {

    return Math.min(
        Math.max(value, min),
        max
    );

}

function average(values = []) {

    const nums = values
        .map(v => Number(v))
        .filter(Number.isFinite);

    if (!nums.length) {

        return 0;

    }

    return nums.reduce(

        (a, b) => a + b,

        0

    ) / nums.length;

}

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

    const review =
        safeObject(
            context?.review
        );

    const decision =
        safeObject(
            context?.decision
        );

    const reasoning =
        safeObject(
            context?.reasoning
        );

    const recommendation =
        safeObject(
            context?.recommendation
        );

    const validation =
        safeObject(
            context?.entryValidation
        );

    const protection =
        safeObject(
            context?.protection
        );

    const position =
        safeObject(
            context?.position
        );

    const history =
        safeObject(
            context?.history
        );

    const confidence =
        clamp(

            toNumber(

                thesis.confidence ??

                recommendation.confidence ??

                reasoning.confidence ??

                context?.confidence ??

                0

            )

        );

    return {

        context,

        confidence,
    

        thesis,

        evidence,

        analyses,

        review,

        decision,

        reasoning,

        recommendation,

        validation,

        protection,

        position,

        history,

        engines:

            Object.entries(evidence).map(

                ([name, value]) => ({

                    name,

                    ...safeObject(value),

                })

            ),

    };

}

// ==========================================================
// Action
// ==========================================================

function calculateAction(
    context,
    confidence
) {

    const recommendation =
        context?.recommendation || {};

    const thesis =
        context?.investmentThesis || {};

    const exitReadiness =
        context?.exitReadiness ||
        thesis.exitReadiness ||
        recommendation.exitReadiness;

    const positionHealth =
        context?.positionHealth ||
        thesis.positionHealth ||
        recommendation.positionHealth;

    const forecastScore =
        toNumber(
            context?.analyses?.forecast?.forecastScore ??
            context?.analyses?.forecast?.score
        );

    const riskScore =
        toNumber(
            context?.analyses?.risk?.riskScore ??
            context?.analyses?.risk?.score
        );

    // ============================================
    // Forced exits always win
    // ============================================

    if (exitReadiness === "EXIT_NOW") {

        return ACTIONS.FULL_EXIT;

    }

    if (exitReadiness === "PREPARE_EXIT") {

        return ACTIONS.PARTIAL_EXIT;

    }

    if (positionHealth === "CRITICAL") {

        return ACTIONS.FULL_EXIT;

    }

    if (positionHealth === "WEAK") {

        return ACTIONS.REDUCE;

    }

    // ============================================
    // Risk override
    // ============================================

    if (riskScore >= 90) {

        return ACTIONS.AVOID;

    }

    if (
        riskScore >= 75 &&
        confidence < 85
    ) {

        return ACTIONS.WATCH;

    }

    // ============================================
    // Forecast override
    // ============================================

    if (
        forecastScore >= 90 &&
        confidence >= 85
    ) {

        return ACTIONS.STRONG_BUY;

    }

    // ============================================
    // Confidence decision
    // ============================================

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

        return ACTIONS.WATCH;

    }

    if (confidence >= 20) {

        return ACTIONS.REDUCE;

    }

    return ACTIONS.AVOID;

}

// ==========================================================
// Conviction
// ==========================================================

function calculateConviction(
    confidence
) {

    confidence = clamp(
        toNumber(confidence)
    );

    if (confidence >= 95) {

        return CONVICTION.VERY_HIGH;

    }

    if (confidence >= 80) {

        return CONVICTION.HIGH;

    }

    if (confidence >= 65) {

        return CONVICTION.MODERATE;

    }

    if (confidence >= 45) {

        return CONVICTION.LOW;

    }

    return CONVICTION.VERY_LOW;

}

// ==========================================================
// Risk Level
// ==========================================================

function calculateRisk(
    confidence
) {

    confidence = clamp(
        toNumber(confidence)
    );

    if (confidence >= 95) {

        return RISK.VERY_LOW;

    }

    if (confidence >= 80) {

        return RISK.LOW;

    }

    if (confidence >= 60) {

        return RISK.MEDIUM;

    }

    if (confidence >= 40) {

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
    action,
    context = {}
) {

    const recommendation =
        context?.recommendation || {};

    const confidence =
        toNumber(
            recommendation.confidence ??
            context?.confidence
        );

    const urgency =
        recommendation.urgency ??
        "NORMAL";

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
            action !== ACTIONS.FULL_EXIT,

        confidence,

        urgency,

        allowScalingIn:
            confidence >= 85,

        allowPartialTakeProfit:
            confidence >= 70,

        requiresConfirmation:
            confidence < 70,

        cooldownMinutes:

            urgency === "CRITICAL"
                ? 0
                : urgency === "HIGH"
                ? 2
                : urgency === "NORMAL"
                ? 5
                : 10,

    };

}

// ==========================================================
// Explanation
// ==========================================================

function buildExplanation(
    thesis = {}
) {

    const unique = values =>
        [...new Set(
            safeArray(values)
                .map(item =>
                    String(item).trim()
                )
                .filter(Boolean)
        )];

    return {

        summary:
            String(
                thesis.summary || ""
            ).trim(),

        positives:
            unique(
                thesis.strengths
            ),

        negatives:
            unique(
                thesis.weaknesses
            ),

        risks:
            unique(
                thesis.risks
            ),

        assumptions:
            unique(
                thesis.assumptions
            ),

        convictionDrivers:
            unique(
                thesis.convictionDrivers
            ),

        conditions:
            unique(
                thesis.monitoringPriorities
            ),

        monitoringPriorities:
            unique(
                thesis.monitoringPriorities
            ),

        positivesCount:
            unique(
                thesis.strengths
            ).length,

        negativesCount:
            unique(
                thesis.weaknesses
            ).length,

        riskCount:
            unique(
                thesis.risks
            ).length,

    };

}

// ==========================================================
// Scorecard
// ==========================================================

function buildScorecard(
    context
) {

    const analyses =
        safeObject(
            context?.analyses
        );

    const score = value =>
        value == null
            ? null
            : clamp(
                toNumber(value)
            );

    return {

        confidence:
            score(
                context?.confidence
            ),

        liquidity:
            score(
                analyses.liquidity?.score
            ),

        volume:
            score(
                analyses.volume?.score
            ),

        momentum:
            score(
                analyses.momentum?.score
            ),

        wallets:
            score(
                analyses.wallets?.score
            ),

        holders:
            score(
                analyses.holders?.score
            ),

        chart:
            score(
                analyses.chart?.score
            ),

        forecast:
            score(
                analyses.forecast?.score ??
                analyses.forecast?.forecastScore
            ),

        risk:
            score(
                analyses.risk?.score ??
                analyses.risk?.riskScore
            ),

        historical:
            score(
                analyses.historical?.score
            ),

        walletQuality:
            score(
                analyses.walletQuality?.score
            ),

        holderDistribution:
            score(
                analyses.holderDistribution?.score
            ),

        riskStructure:
            score(
                analyses.riskStructure?.score
            ),

        consensus:
            score(
                context?.recommendation?.consensus?.score
            ),

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

    const thesis =
        ai.thesis;

    const action =
        calculateAction(

            context,

            confidence

        );

    const engineScores =
        ai.engines
            .map(

                engine =>

                    toNumber(

                        engine.confidenceContribution

                    )

            )
            .filter(

                score =>

                    score > 0

            );

    const engineConfidence =

        engineScores.length

            ? Math.round(

                  average(

                      engineScores

                  )

              )

            : confidence;

    const overallConfidence =

        clamp(

            Math.round(

                confidence * 0.65 +

                engineConfidence * 0.35

            )

        );

const consensusScore =
    ai.engines.length
        ? Math.round(
              average(
                  ai.engines.map(engine =>
                      toNumber(
                          engine.confidenceContribution
                      )
                  )
              )
          )
        : overallConfidence;

const agreementRatio =
    ai.engines.length
        ? Math.round(
              (
                  ai.engines.filter(
                      engine =>
                          toNumber(
                              engine.confidenceContribution
                          ) >= overallConfidence - 10
                  ).length /
                  ai.engines.length
              ) * 100
          )
        : 100;

const disagreementRatio =
    100 - agreementRatio;


const strengths = new Set();

const weaknesses = new Set();

const risks = new Set();

const convictionDrivers = new Set();

const monitoringPriorities = new Set();

const assumptions = new Set();

for (const engine of ai.engines) {

    if (!engine) continue;

    safeArray(engine.strengths)
        .forEach(item => strengths.add(item));

    safeArray(engine.weaknesses)
        .forEach(item => weaknesses.add(item));

    safeArray(engine.risks)
        .forEach(item => risks.add(item));

    safeArray(engine.convictionDrivers)
        .forEach(item => convictionDrivers.add(item));

    safeArray(engine.monitoringPriorities)
        .forEach(item => monitoringPriorities.add(item));

    safeArray(engine.assumptions)
        .forEach(item => assumptions.add(item));

}


    return {

        action,

        confidence: overallConfidence,

        conviction:

            calculateConviction(
                overallConfidence
            ),

        urgency:

            calculateUrgency(
                action
            ),

        riskLevel:

            calculateRisk(
                overallConfidence
            ),

        explanation:

    buildExplanation({

    ...thesis,

    strengths:
        [...strengths],

    weaknesses:
        [...weaknesses],

    risks:
        [...risks],

    assumptions:
        [...assumptions],

    convictionDrivers:
        [...convictionDrivers],

    monitoringPriorities:
        [...monitoringPriorities],

}),

        scorecard:

            buildScorecard(
                context
            ),

       execution:

    buildExecutionHints(
        action,
        context
    ),

        generatedAt:
    new Date(),

engine:
    "RecommendationEngine",

version:
    "2.0.0",

timestamp:
    Date.now(),

analysisCount:
    ai.engines.length,

historicalConfidence:
    confidence,

aiConfidence:
    engineConfidence,

overallConfidence,

confidenceBreakdown: {

    historical:
        confidence,

    ai:
        engineConfidence,

    final:
        overallConfidence,

},

      consensus: {

    score:
        consensusScore,

    agreement:
        agreementRatio,

    disagreement:
        disagreementRatio,

    engineCount:
        ai.engines.length,

    unanimous:
        agreementRatio >= 90,

},

strengths:
    [...strengths],

weaknesses:
    [...weaknesses],

risks:
    [...risks],

assumptions:
    [...assumptions],

convictionDrivers:
    [...convictionDrivers],

monitoringPriorities:
    [...monitoringPriorities],
metrics: {

    positiveSignals:
        strengths.size,

    warningSignals:
        weaknesses.size,

    riskSignals:
        risks.size,

    convictionSignals:
        convictionDrivers.size,

    monitoringSignals:
        monitoringPriorities.size,

},

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
