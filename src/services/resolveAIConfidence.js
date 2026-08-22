// src/services/resolveAIConfidence.js

/**
 * ==========================================================
 * AI CONFIDENCE RESOLVER
 * ==========================================================
 *
 * ONE authoritative confidence-selection rule.
 *
 * This version includes diagnostics so we can determine
 * exactly where confidence exists in the AI context.
 *
 * ==========================================================
 */

function isUsableConfidence(value) {

    const number = Number(value);

    return (
        Number.isFinite(number) &&
        number > 0
    );
}


function normalizeConfidence(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            100,
            number
        )
    );
}


export function resolveAIConfidence(
    aiContext
) {

    if (!aiContext) {

        console.log(
            "🔬 [CONFIDENCE RESOLVER] No AI context"
        );

        return {
            confidence: 0,
            source: "DEFAULT_0",
        };
    }


    // ======================================================
    // EXTRACT CANDIDATES
    // ======================================================

    const tradeDecisionConfidence =
        aiContext
            ?.tradeDecision
            ?.confidence;


    const exitDecisionConfidence =
        aiContext
            ?.exitDecision
            ?.confidence;


    const recommendationConfidence =
        aiContext
            ?.recommendation
            ?.confidence;


    const protectionConfidence =
        aiContext
            ?.protectionStrategy
            ?.confidence;


    const overallConfidence =
        aiContext
            ?.confidence
            ?.overall;


    // ======================================================
    // DIAGNOSTIC
    // ======================================================

    console.log(
        "\n============================================================"
    );

    console.log(
        "🔬 [CONFIDENCE RESOLVER] INPUT DIAGNOSTIC"
    );

    console.log(
        "============================================================"
    );

    console.dir(
        {

            candidates: {

                tradeDecisionConfidence,

                exitDecisionConfidence,

                recommendationConfidence,

                protectionConfidence,

                overallConfidence,

            },

            structures: {

                tradeDecision:
                    aiContext.tradeDecision,

                exitDecision:
                    aiContext.exitDecision,

                recommendation:
                    aiContext.recommendation,

                protectionStrategy:
                    aiContext.protectionStrategy,

                confidence:
                    aiContext.confidence,

            },

        },
        {
            depth: 5,
            colors: true,
        }
    );

    console.log(
        "============================================================\n"
    );


    // ======================================================
    // 1. FINAL TRADE DECISION
    // ======================================================

    if (
        isUsableConfidence(
            tradeDecisionConfidence
        )
    ) {

        const confidence =
            normalizeConfidence(
                tradeDecisionConfidence
            );

        console.log(
            "🎯 [CONFIDENCE RESOLVER]",
            {
                confidence,
                source:
                    "tradeDecision.confidence",
            }
        );

        return {

            confidence,

            source:
                "tradeDecision.confidence",

        };
    }


    // ======================================================
    // 2. EXIT DECISION
    // ======================================================

    if (
        isUsableConfidence(
            exitDecisionConfidence
        )
    ) {

        const confidence =
            normalizeConfidence(
                exitDecisionConfidence
            );

        console.log(
            "🎯 [CONFIDENCE RESOLVER]",
            {
                confidence,
                source:
                    "exitDecision.confidence",
            }
        );

        return {

            confidence,

            source:
                "exitDecision.confidence",

        };
    }


    // ======================================================
    // 3. RECOMMENDATION
    // ======================================================

    if (
        isUsableConfidence(
            recommendationConfidence
        )
    ) {

        const confidence =
            normalizeConfidence(
                recommendationConfidence
            );

        console.log(
            "🎯 [CONFIDENCE RESOLVER]",
            {
                confidence,
                source:
                    "recommendation.confidence",
            }
        );

        return {

            confidence,

            source:
                "recommendation.confidence",

        };
    }


    // ======================================================
    // 4. PROTECTION
    // ======================================================

    if (
        isUsableConfidence(
            protectionConfidence
        )
    ) {

        const confidence =
            normalizeConfidence(
                protectionConfidence
            );

        console.log(
            "🎯 [CONFIDENCE RESOLVER]",
            {
                confidence,
                source:
                    "protection.confidence",
            }
        );

        return {

            confidence,

            source:
                "protection.confidence",

        };
    }


    // ======================================================
    // 5. OVERALL CONTEXT CONFIDENCE
    // ======================================================

    if (
        isUsableConfidence(
            overallConfidence
        )
    ) {

        const confidence =
            normalizeConfidence(
                overallConfidence
            );

        console.log(
            "🎯 [CONFIDENCE RESOLVER]",
            {
                confidence,
                source:
                    "aiContext.confidence.overall",
            }
        );

        return {

            confidence,

            source:
                "aiContext.confidence.overall",

        };
    }


    // ======================================================
    // NOTHING FOUND
    // ======================================================

    console.warn(
        "\n⚠️ [CONFIDENCE RESOLVER] NO USABLE CONFIDENCE FOUND"
    );

    console.warn(
        "Available AI context keys:",
        Object.keys(
            aiContext
        )
    );


    return {

        confidence: 0,

        source:
            "DEFAULT_0",

    };
}


export default resolveAIConfidence;