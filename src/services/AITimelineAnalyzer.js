/**
 * ==========================================================
 * AI Timeline Analyzer
 * ==========================================================
 *
 * Analyzes the recent AI observation history for an active
 * position.
 *
 * Responsibilities
 * ----------------
 * ✔ Detect confidence direction
 * ✔ Detect health deterioration
 * ✔ Detect trend deterioration
 * ✔ Detect protection escalation
 * ✔ Detect recommendation changes
 * ✔ Detect sustained weakening
 * ✔ Provide historical context to AI engines
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Call Jupiter
 * ✘ Call RPC
 * ✘ Modify Redis
 * ✘ Save MongoDB
 *
 * ==========================================================
 */

export function analyzeAITimeline(
    aiMemory = {},
    options = {}
) {

    const timeline = Array.isArray(
        aiMemory?.timeline
    )
        ? aiMemory.timeline
        : [];

    const requestedWindow = Number(
        options.windowSize || 10
    );

    const windowSize = Math.max(
        2,
        Math.min(requestedWindow, 20)
    );

    const recent = timeline.slice(
        -windowSize
    );

    // ======================================================
    // Empty Timeline
    // ======================================================

    if (recent.length === 0) {

        return {

            available: false,

            sampleCount: 0,

            windowSize,

            confidence: {
                current: null,
                previous: null,
                change: null,
                direction: "UNKNOWN",
                declining: false,
                improving: false,
            },

            health: {
                current: null,
                previous: null,
                direction: "UNKNOWN",
                weakening: false,
            },

            trend: {
                current: null,
                previous: null,
                direction: "UNKNOWN",
                weakening: false,
            },

            protection: {
                current: null,
                previous: null,
                escalating: false,
            },

            recommendation: {
                current: null,
                previous: null,
                changed: false,
            },

            action: {
                current: null,
                previous: null,
                changed: false,
            },

            evolution: {
                state: "INSUFFICIENT_HISTORY",
                weakeningCount: 0,
                improvingCount: 0,
            },

        };

    }

    // ======================================================
    // Helpers
    // ======================================================

    const normalize = (value) =>
        String(value || "")
            .trim()
            .toUpperCase();

    const numeric = (value) => {

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : null;

    };

    // ======================================================
    // Current / Previous
    // ======================================================

    const current =
        recent[recent.length - 1] || {};

    const previous =
        recent.length >= 2
            ? recent[recent.length - 2]
            : null;

    // ======================================================
    // Confidence Analysis
    // ======================================================

    const confidenceValues =
        recent
            .map((snapshot) =>
                numeric(snapshot.confidence)
            )
            .filter((value) =>
                value !== null
            );

    const currentConfidence =
        numeric(current.confidence);

    const previousConfidence =
        previous
            ? numeric(previous.confidence)
            : null;

    const confidenceChange =
        currentConfidence !== null &&
        previousConfidence !== null
            ? currentConfidence -
              previousConfidence
            : null;

    const confidenceFirst =
        confidenceValues.length > 0
            ? confidenceValues[0]
            : null;

    const confidenceOverallChange =
        currentConfidence !== null &&
        confidenceFirst !== null
            ? currentConfidence -
              confidenceFirst
            : null;

    const confidenceDeclineCount =
        confidenceValues.length >= 2
            ? confidenceValues.reduce(
                (count, value, index) => {

                    if (index === 0) {
                        return count;
                    }

                    return value <
                        confidenceValues[index - 1]
                        ? count + 1
                        : count;

                },
                0
            )
            : 0;

    const confidenceIncreaseCount =
        confidenceValues.length >= 2
            ? confidenceValues.reduce(
                (count, value, index) => {

                    if (index === 0) {
                        return count;
                    }

                    return value >
                        confidenceValues[index - 1]
                        ? count + 1
                        : count;

                },
                0
            )
            : 0;

    let confidenceDirection =
        "STABLE";

    if (
        confidenceOverallChange !== null &&
        confidenceOverallChange <= -10
    ) {

        confidenceDirection = "DECLINING";

    } else if (
        confidenceOverallChange !== null &&
        confidenceOverallChange >= 10
    ) {

        confidenceDirection = "IMPROVING";

    }

    // ======================================================
    // Health Analysis
    // ======================================================

    const healthValues =
        recent
            .map((snapshot) =>
                normalize(snapshot.health)
            )
            .filter(Boolean);

    const currentHealth =
        normalize(current.health) || null;

    const previousHealth =
        previous
            ? normalize(previous.health) || null
            : null;

    const healthOrder = {

        UNKNOWN: 0,

        DANGEROUS: 1,

        CRITICAL: 1,

        WEAKENING: 2,

        WEAK: 2,

        MODERATE: 3,

        MODERATE_RISK: 3,

        HEALTHY: 4,

        STRONG: 5,

        VERY_STRONG: 6,

    };

    const currentHealthScore =
        healthOrder[currentHealth] ?? null;

    const previousHealthScore =
        healthOrder[previousHealth] ?? null;

    const healthWeakening =
        currentHealthScore !== null &&
        previousHealthScore !== null &&
        currentHealthScore <
        previousHealthScore;

    let healthWeakeningCount = 0;

    for (
        let i = 1;
        i < healthValues.length;
        i++
    ) {

        const previousHealthValue =
            healthOrder[
                healthValues[i - 1]
            ];

        const currentHealthValue =
            healthOrder[
                healthValues[i]
            ];

        if (
            previousHealthValue !== undefined &&
            currentHealthValue !== undefined &&
            currentHealthValue <
            previousHealthValue
        ) {

            healthWeakeningCount++;

        }

    }

    // ======================================================
    // Trend Analysis
    // ======================================================

    const trendValues =
        recent
            .map((snapshot) =>
                normalize(snapshot.trend)
            )
            .filter(Boolean);

    const currentTrend =
        normalize(current.trend) || null;

    const previousTrend =
        previous
            ? normalize(previous.trend) || null
            : null;

    const bullishTerms = new Set([
        "BULLISH",
        "STRONG_BULLISH",
        "VERY_BULLISH",
        "UPTREND",
        "STRONG_UPTREND",
        "ACCUMULATION",
    ]);

    const bearishTerms = new Set([
        "BEARISH",
        "STRONG_BEARISH",
        "VERY_BEARISH",
        "DOWNTREND",
        "STRONG_DOWNTREND",
        "DISTRIBUTION",
    ]);

    const weakeningTerms = new Set([
        "WEAKENING",
        "WEAK",
        "DISTRIBUTION",
        "BEARISH",
        "DOWNTREND",
    ]);

    const currentTrendWeakening =
        weakeningTerms.has(currentTrend);

    const previousTrendBullish =
        bullishTerms.has(previousTrend);

    const transitionToDistribution =
        previousTrendBullish &&
        currentTrend === "DISTRIBUTION";

    const trendWeakeningCount =
        trendValues.filter((trend) =>
            weakeningTerms.has(trend)
        ).length;

    // ======================================================
    // Protection Analysis
    // ======================================================

    const protectionValues =
        recent
            .map((snapshot) =>
                normalize(snapshot.protection)
            )
            .filter(Boolean);

    const currentProtection =
        normalize(current.protection) || null;

    const previousProtection =
        previous
            ? normalize(previous.protection) || null
            : null;

    const protectionOrder = {

        NONE: 0,

        MONITOR: 1,

        NORMAL: 1,

        PROFIT_LOCK: 2,

        CAPITAL_PROTECTION: 3,

        EXIT_READY: 4,

        FULL_EXIT: 5,

    };

    const currentProtectionScore =
        protectionOrder[currentProtection] ?? null;

    const previousProtectionScore =
        protectionOrder[previousProtection] ?? null;

    const protectionEscalating =
        currentProtectionScore !== null &&
        previousProtectionScore !== null &&
        currentProtectionScore >
        previousProtectionScore;

    // ======================================================
    // Recommendation Analysis
    // ======================================================

    const currentRecommendation =
        normalize(current.recommendation) ||
        null;

    const previousRecommendation =
        previous
            ? normalize(previous.recommendation) ||
              null
            : null;

    const recommendationChanged =
        currentRecommendation !== null &&
        previousRecommendation !== null &&
        currentRecommendation !==
        previousRecommendation;

    // ======================================================
    // Action Analysis
    // ======================================================

    const currentAction =
        normalize(current.action) || null;

    const previousAction =
        previous
            ? normalize(previous.action) || null
            : null;

    const actionChanged =
        currentAction !== null &&
        previousAction !== null &&
        currentAction !== previousAction;

    // ======================================================
    // Overall Evolution
    // ======================================================

    let weakeningSignals = 0;
    let improvingSignals = 0;

    if (
        confidenceDirection === "DECLINING"
    ) {

        weakeningSignals++;

    }

    if (healthWeakening) {

        weakeningSignals++;

    }

    if (currentTrendWeakening) {

        weakeningSignals++;

    }

    if (transitionToDistribution) {

        weakeningSignals += 2;

    }

    if (protectionEscalating) {

        weakeningSignals++;

    }

    if (
        confidenceDirection === "IMPROVING"
    ) {

        improvingSignals++;

    }

    if (
        currentHealthScore !== null &&
        previousHealthScore !== null &&
        currentHealthScore >
        previousHealthScore
    ) {

        improvingSignals++;

    }

    if (
        bullishTerms.has(currentTrend) &&
        !currentTrendWeakening
    ) {

        improvingSignals++;

    }

    // ======================================================
    // Evolution State
    // ======================================================

    let evolutionState =
        "STABLE";

    if (
        weakeningSignals >= 4
    ) {

        evolutionState =
            "STRONGLY_DETERIORATING";

    } else if (
        weakeningSignals >= 2
    ) {

        evolutionState =
            "DETERIORATING";

    } else if (
        improvingSignals >= 3
    ) {

        evolutionState =
            "IMPROVING";

    } else if (
        improvingSignals >= 2
    ) {

        evolutionState =
            "STRENGTHENING";

    }

    // ======================================================
    // Return Timeline Intelligence
    // ======================================================

    return {

        available: recent.length >= 2,

        sampleCount: recent.length,

        windowSize,

        confidence: {

            current:
                currentConfidence,

            previous:
                previousConfidence,

            change:
                confidenceChange,

            overallChange:
                confidenceOverallChange,

            direction:
                confidenceDirection,

            declining:
                confidenceDirection ===
                "DECLINING",

            improving:
                confidenceDirection ===
                "IMPROVING",

            declineCount:
                confidenceDeclineCount,

            increaseCount:
                confidenceIncreaseCount,

        },

        health: {

            current:
                currentHealth,

            previous:
                previousHealth,

            weakening:
                healthWeakening,

            weakeningCount:
                healthWeakeningCount,

        },

        trend: {

            current:
                currentTrend,

            previous:
                previousTrend,

            weakening:
                currentTrendWeakening,

            weakeningCount:
                trendWeakeningCount,

            transitionToDistribution,

        },

        protection: {

            current:
                currentProtection,

            previous:
                previousProtection,

            escalating:
                protectionEscalating,

        },

        recommendation: {

            current:
                currentRecommendation,

            previous:
                previousRecommendation,

            changed:
                recommendationChanged,

        },

        action: {

            current:
                currentAction,

            previous:
                previousAction,

            changed:
                actionChanged,

        },

        evolution: {

            state:
                evolutionState,

            weakeningCount:
                weakeningSignals,

            improvingCount:
                improvingSignals,

        },

    };

}

export default {

    analyzeAITimeline,

};