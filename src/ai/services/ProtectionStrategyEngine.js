/**
 * ==========================================================
 * ProtectionStrategyEngine
 * ==========================================================
 *
 * Determines how an active position should be protected.
 *
 * Responsibilities
 * ----------------
 * ✔ Evaluate profit state
 * ✔ Evaluate profit retention
 * ✔ Evaluate trend quality
 * ✔ Evaluate drawdown
 * ✔ Determine protection level
 * ✔ Determine protection intent
 * ✔ Activate protection capabilities
 * ✔ Classify event priority
 * ✔ Trigger emergency review
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

    setProtectionStrategy,

    addDebug,

} from "./AIContextUtils.js";

// ==========================================================
// Protection Levels
// ==========================================================

const LEVEL = Object.freeze({

    NONE: "NONE",

    LIGHT: "LIGHT",

    MODERATE: "MODERATE",

    AGGRESSIVE: "AGGRESSIVE",

    MAXIMUM: "MAXIMUM",

});

// ==========================================================
// Protection Intent
// ==========================================================

const INTENT = Object.freeze({

    BUILD_POSITION:
        "BUILD_POSITION",

    ALLOW_TREND:
        "ALLOW_TREND",

    LOCK_PROFIT:
        "LOCK_PROFIT",

    REDUCE_RISK:
        "REDUCE_RISK",

    PREPARE_EXIT:
        "PREPARE_EXIT",

});

// ==========================================================
// Event Priority
// ==========================================================

const PRIORITY = Object.freeze({

    LOW: "LOW",

    NORMAL: "NORMAL",

    HIGH: "HIGH",

    CRITICAL: "CRITICAL",

    EMERGENCY: "EMERGENCY",

});

// ==========================================================
// Monitoring
// ==========================================================

const MONITORING = Object.freeze({

    NONE: 60,

    LIGHT: 30,

    MODERATE: 15,

    AGGRESSIVE: 5,

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

function getPnL(
    context
) {

    return Number(

        context.position?.profitPercent ??

        context.position?.pnlPercent ??

        0

    );

}

function getHighestPnL(
    context
) {

    return Number(

        context.position?.highestProfitPercent ??

        getPnL(context)

    );

}

function getDrawdown(
    context
) {

    return Number(

        context.position?.drawdownPercent ??

        0

    );

}

// ==========================================================
// Profit State
// ==========================================================

function evaluateProfitState(
    context
) {

    const pnl =
        getPnL(context);

    if (

        pnl < 0

    ) {

        return {

            score: 0,

            state: "LOSING",

        };

    }

    if (

        pnl < 20

    ) {

        return {

            score: 25,

            state: "EARLY_PROFIT",

        };

    }

    if (

        pnl < 50

    ) {

        return {

            score: 50,

            state: "BUILDING",

        };

    }

    if (

        pnl < 100

    ) {

        return {

            score: 75,

            state: "STRONG",

        };

    }

    return {

        score: 100,

        state: "EXPLOSIVE",

    };

}

// ==========================================================
// Profit Retention
// ==========================================================

function evaluateProfitRetention(
    context
) {

    const current =
        getPnL(context);

    const highest =
        getHighestPnL(context);

    if (

        highest <= 0

    ) {

        return {

            retained: 100,

            erosion: 0,

        };

    }

    const retained =

        Math.round(

            (current / highest) * 100

        );

    return {

        retained,

        erosion:

            100 - retained,

    };

}

// ==========================================================
// Trend Strength
// ==========================================================

function evaluateTrendStrength(
    context
) {

    return Number(

        context.positionHealth?.trendStrength ??

        context.analyses?.forecast?.score ??

        50

    );

}

// ==========================================================
// Momentum
// ==========================================================

function evaluateMomentum(
    context
) {

    return Number(

        context.analyses?.momentum?.score ??

        50

    );

}

// ==========================================================
// Liquidity
// ==========================================================

function evaluateLiquidity(
    context
) {

    return Number(

        context.analyses?.liquidity?.score ??

        50

    );

}

// ==========================================================
// Risk
// ==========================================================

function evaluateRisk(
    context
) {

    return Number(

        context.analyses?.risk?.score ??

        50

    );

}

// ==========================================================
// Drawdown
// ==========================================================

function evaluateDrawdown(
    context
) {

    return getDrawdown(
        context
    );

}

// ==========================================================
// Protection Level
// ==========================================================
function determineProtectionLevel(
    context,
    metrics
) {

    // Emergency conditions

    if (

        metrics.retention.erosion >= 40 ||

        metrics.risk >= 80 ||

        metrics.drawdown >= 30 ||

        metrics.liquidity <= 25 ||

        metrics.momentum <= 25 ||

        metrics.trend <= 25

    ) {

        return LEVEL.MAXIMUM;

    }

    // Strong protection

    if (

        metrics.retention.erosion >= 25 ||

        metrics.risk >= 60 ||

        metrics.liquidity <= 40 ||

        metrics.momentum <= 40 ||

        metrics.trend <= 40

    ) {

        return LEVEL.AGGRESSIVE;

    }

    // Lock profits

    if (

        metrics.profitState.score >= 75 ||

        metrics.retention.retained >= 80

    ) {

        return LEVEL.MODERATE;

    }

    // Healthy trend

    if (

        metrics.profitState.score >= 50

    ) {

        return LEVEL.LIGHT;

    }

    return LEVEL.NONE;

}

// ==========================================================
// Protection Intent
// ==========================================================

function determineProtectionIntent(
    level
) {

    switch (

        level

    ) {

        case LEVEL.NONE:

            return INTENT.BUILD_POSITION;

        case LEVEL.LIGHT:

            return INTENT.ALLOW_TREND;

        case LEVEL.MODERATE:

            return INTENT.LOCK_PROFIT;

        case LEVEL.AGGRESSIVE:

            return INTENT.REDUCE_RISK;

        case LEVEL.MAXIMUM:

            return INTENT.PREPARE_EXIT;

        default:

            return INTENT.ALLOW_TREND;

    }

}

// ==========================================================
// Capabilities
// ==========================================================

function determineCapabilities(
    level
) {

    return {

        breakEven: {

            enabled:

                level !== LEVEL.NONE,

            aggressiveness:

                level === LEVEL.MAXIMUM

                    ? "VERY_HIGH"

                    : level === LEVEL.AGGRESSIVE

                    ? "HIGH"

                    : level === LEVEL.MODERATE

                    ? "MEDIUM"

                    : "LOW",

        },

        dynamicTrailing: {

            enabled:

                level !== LEVEL.NONE,

            aggressiveness:

                level === LEVEL.MAXIMUM

                    ? "VERY_HIGH"

                    : level === LEVEL.AGGRESSIVE

                    ? "HIGH"

                    : level === LEVEL.MODERATE

                    ? "MEDIUM"

                    : "LOW",

        },

        partialProfitLock: {

            enabled:

                level === LEVEL.MODERATE ||

                level === LEVEL.AGGRESSIVE ||

                level === LEVEL.MAXIMUM,

            aggressiveness:

                level === LEVEL.MAXIMUM

                    ? "VERY_HIGH"

                    : level === LEVEL.AGGRESSIVE

                    ? "HIGH"

                    : "MEDIUM",

        },

        dynamicStopLoss: {

            enabled:

                level === LEVEL.AGGRESSIVE ||

                level === LEVEL.MAXIMUM,

            aggressiveness:

                level === LEVEL.MAXIMUM

                    ? "VERY_HIGH"

                    : "HIGH",

        },

        exitReviewTrigger: {

            enabled:

                level === LEVEL.AGGRESSIVE ||

                level === LEVEL.MAXIMUM,

        },

        positionScaling: {

            enabled:

                level === LEVEL.MODERATE ||

                level === LEVEL.AGGRESSIVE,

        },

        adaptiveMonitoring: {

            enabled: true,

        },

    };

}

// ==========================================================
// Monitoring Strategy
// ==========================================================

function determineMonitoringStrategy(
    level
) {

    if (

        level === LEVEL.MAXIMUM

    ) {

        return {

            mode:

                "EVENT_DRIVEN",

            fallbackIntervalSeconds:

                5,

            reason:

                "Maximum protection requires immediate AI reviews.",

        };

    }

    return {

        mode:

            "INTERVAL",

        intervalSeconds:

            MONITORING[level] ??

            30,

        reason:

            "Routine monitoring.",

    };

}
// ==========================================================
// Event Priority
// ==========================================================

function classifyEventPriority(
    level
) {

    switch (

        level

    ) {

        case LEVEL.NONE:

            return PRIORITY.LOW;

        case LEVEL.LIGHT:

            return PRIORITY.NORMAL;

        case LEVEL.MODERATE:

            return PRIORITY.HIGH;

        case LEVEL.AGGRESSIVE:

            return PRIORITY.CRITICAL;

        case LEVEL.MAXIMUM:

            return PRIORITY.EMERGENCY;

        default:

            return PRIORITY.NORMAL;

    }

}

// ==========================================================
// Emergency Review
// ==========================================================

function classifyEmergencyReview(
    priority
) {

    return {

        required:

            priority === PRIORITY.EMERGENCY,

        priority,

        reason:

            priority === PRIORITY.EMERGENCY

                ? "Emergency protection event detected."

                : "Normal monitoring.",

    };

}

// ==========================================================
// Protection Confidence
// ==========================================================

function calculateProtectionConfidence(
    metrics
) {

    const weights = {

        trend: 0.25,

        momentum: 0.20,

        liquidity: 0.20,

        retention: 0.20,

        risk: 0.15,

    };

    const score =

        metrics.trend *

        weights.trend +

        metrics.momentum *

        weights.momentum +

        metrics.liquidity *

        weights.liquidity +

        metrics.retention.retained *

        weights.retention +

        (100 - metrics.risk) *

        weights.risk;

    return Math.round(

        clampScore(score)

    );

}

// ==========================================================
// Reasons
// ==========================================================

function buildReasons(
    level,
    metrics
) {

    const reasons = [];

    if (

        metrics.profitState.state ===

        "EXPLOSIVE"

    ) {

        reasons.push(

            "Position has generated exceptional profit."

        );

    }

    if (

        metrics.retention.erosion >= 25

    ) {

        reasons.push(

            "Meaningful profit erosion detected."

        );

    }

    if (

        metrics.momentum < 40

    ) {

        reasons.push(

            "Momentum is weakening."

        );

    }

    if (

        metrics.liquidity < 40

    ) {

        reasons.push(

            "Liquidity is deteriorating."

        );

    }

    if (

        metrics.risk >= 70

    ) {

        reasons.push(

            "Risk level has increased."

        );

    }

    if (

        level === LEVEL.MAXIMUM

    ) {

        reasons.push(

            "Maximum protection activated."

        );

    }

    return reasons;

}

// ==========================================================
// Protection Report
// ==========================================================

function buildProtectionReport(
    context
) {

    const metrics = {

        profitState:

            evaluateProfitState(
                context
            ),

        retention:

            evaluateProfitRetention(
                context
            ),

        trend:

            evaluateTrendStrength(
                context
            ),

        momentum:

            evaluateMomentum(
                context
            ),

        liquidity:

            evaluateLiquidity(
                context
            ),

        risk:

            evaluateRisk(
                context
            ),

        drawdown:

            evaluateDrawdown(
                context
            ),

    };

    const protectionLevel =

        determineProtectionLevel(

            context,

            metrics

        );

    const protectionIntent =

        determineProtectionIntent(

            protectionLevel

        );

    const confidence =

        calculateProtectionConfidence(

            metrics

        );

    const eventPriority =

        classifyEventPriority(

            protectionLevel

        );

    return {

        protectionLevel,

        protectionIntent,

        confidence,

        capabilities:

            determineCapabilities(

                protectionLevel

            ),

        monitoring:

            determineMonitoringStrategy(

                protectionLevel

            ),

        eventPriority,

        emergencyReview:

    classifyEmergencyReview(

        eventPriority

    ),

        metrics,

        reasons:

            buildReasons(

                protectionLevel,

                metrics

            ),

        generatedAt:

            new Date(),

        engine:

            "ProtectionStrategyEngine",

        version:

            "1.0.0",

    };

}

// ==========================================================
// Generate Protection Strategy
// ==========================================================

export function generateProtectionStrategy(
    context
) {

    if (

        !context

    ) {

        throw new Error(

            "ProtectionStrategyEngine: context is required."

        );

    }

    const strategy =

        buildProtectionReport(
            context
        );

    setProtectionStrategy(

        context,

        strategy

    );

    addDebug(

        context,

        "Protection strategy generated.",

        {

            level:

                strategy.protectionLevel,

            intent:

                strategy.protectionIntent,

            confidence:

                strategy.confidence,

            priority:

                strategy.eventPriority,

            emergency:

                strategy.emergencyReview,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    generateProtectionStrategy,

};