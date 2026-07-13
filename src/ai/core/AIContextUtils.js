// ==========================================================
// AI Context Utilities
// ==========================================================
//
// Shared helper functions for manipulating an AI Context.
//
// Responsibilities
// ----------------
// ✔ Timeline management
// ✔ Lifecycle management
// ✔ Engine execution tracking
// ✔ Runtime metrics
// ✔ Diagnostics
// ✔ Runtime flags
//
// NEVER
// -----
// ✘ Call APIs
// ✘ Execute trades
// ✘ Save MongoDB
// ✘ Send Telegram notifications
//
// ==========================================================

/**
 * Current timestamp.
 */
function now() {
    return new Date();
}

/**
 * Calculate duration in milliseconds.
 */
function calculateDuration(startedAt, completedAt = now()) {

    if (!(startedAt instanceof Date)) {
        return null;
    }

    return completedAt.getTime() - startedAt.getTime();

}

// ==========================================================
// Timeline
// ==========================================================

export function addTimelineEvent(
    context,
    stage,
    details = {}
) {

    const timestamp = now();

    context.timeline.push({

        stage,

        timestamp,

        details,

    });

    context.lifecycle.lastUpdated = timestamp;

    if (
        !context.lifecycle.stages.includes(stage)
    ) {

        context.lifecycle.stages.push(stage);

    }

    return context;

}

// ==========================================================
// Lifecycle
// ==========================================================

export function updateLifecycle(
    context,
    state,
    currentPhase = null
) {

    context.lifecycle.state = state;

    if (currentPhase) {

        context.lifecycle.currentPhase =
            currentPhase;

    }

    context.lifecycle.lastUpdated = now();

    return context;

}

// ==========================================================
// Runtime Metrics
// ==========================================================

export function setRuntimeMetric(
    context,
    metric,
    value
) {

    context.runtime[metric] = value;

    return context;

}

// ==========================================================
// Runtime Flags
// ==========================================================

export function setFlag(
    context,
    flag,
    value = true
) {

    if (
        Object.prototype.hasOwnProperty.call(
            context.flags,
            flag
        )
    ) {

        context.flags[flag] = value;

    }

    return context;

}

// ==========================================================
// Diagnostics
// ==========================================================

export function addWarning(
    context,
    warning
) {

    context.diagnostics.warnings.push({

        message: warning,

        timestamp: now(),

    });

    return context;

}

export function addError(
    context,
    error
) {

    context.diagnostics.errors.push({

        message:
            error?.message ||
            String(error),

        stack:
            error?.stack || null,

        timestamp: now(),

    });

    return context;

}

export function addDebug(
    context,
    message,
    data = {}
) {

    context.diagnostics.debug.push({

        message,

        data,

        timestamp: now(),

    });

    return context;

}

// ==========================================================
// Engine Timer Start
// ==========================================================

export function startEngineTimer(
    context,
    engine
) {

    if (!context.engineMetrics[engine]) {

        context.engineMetrics[engine] = {};

    }

    context.engineMetrics[engine] = {

        startedAt: now(),

        completedAt: null,

        durationMs: null,

        success: false,

    };

    markEngineStarted(
        context,
        engine
    );

    return context;

}

// ==========================================================
// Engine Timer Stop
// ==========================================================

export function stopEngineTimer(
    context,
    engine,
    success = true
) {

    const metrics =
        context.engineMetrics[engine];

    if (!metrics?.startedAt) {

        return context;

    }

    metrics.completedAt = now();

    metrics.durationMs =
        calculateDuration(
            metrics.startedAt,
            metrics.completedAt
        );

    metrics.success = success;

    markEngineCompleted(
        context,
        engine
    );

    return context;

}

// ==========================================================
// Engine Started
// ==========================================================

export function markEngineStarted(
    context,
    engine
) {

    addTimelineEvent(

        context,

        `${engine.toUpperCase()}_STARTED`

    );

    return context;

}

// ==========================================================
// Engine Completed
// ==========================================================

export function markEngineCompleted(
    context,
    engine
) {

    addTimelineEvent(

        context,

        `${engine.toUpperCase()}_COMPLETED`

    );

    return context;

}

// ==========================================================
// Engine Failed
// ==========================================================

export function markEngineFailed(
    context,
    engine,
    error = null
) {

    context.confidenceGaps.degradedConfidence = true;

    if (
        !context.confidenceGaps
            .missingEngines
            .includes(engine)
    ) {

        context.confidenceGaps
            .missingEngines
            .push(engine);

    }

    addError(
        context,
        error
    );

    addTimelineEvent(

        context,

        `${engine.toUpperCase()}_FAILED`,

        {

            error:
                error?.message ||
                String(error),

        }

    );

    return context;

}

// ==========================================================
// Store Analysis
// ==========================================================

export function addAnalysis(
    context,
    engine,
    analysis
) {

    context.analyses[engine] = analysis;

    addTimelineEvent(
        context,
        `${engine.toUpperCase()}_ANALYSIS_STORED`
    );

    return context;

}

// ==========================================================
// Store Evidence
// ==========================================================

export function addEvidence(
    context,
    engine,
    evidence
) {

    context.evidence[engine] = evidence;

    addTimelineEvent(
        context,
        `${engine.toUpperCase()}_EVIDENCE_STORED`
    );

    return context;

}

// ==========================================================
// Confidence Gap
// ==========================================================

export function addConfidenceGap(
    context,
    engine,
    reason
) {

    context.confidenceGaps.degradedConfidence = true;

    if (
        !context.confidenceGaps.missingEngines.includes(engine)
    ) {

        context.confidenceGaps.missingEngines.push(
            engine
        );

    }

    if (
        !context.confidenceGaps.unavailableData.includes(reason)
    ) {

        context.confidenceGaps.unavailableData.push(
            reason
        );

    }

    addTimelineEvent(
        context,
        "CONFIDENCE_GAP_ADDED",
        {
            engine,
            reason,
        }
    );

    return context;

}

// ==========================================================
// AI Outputs
// ==========================================================

export function setInvestmentThesis(
    context,
    thesis
) {

    context.investmentThesis = thesis;

    addTimelineEvent(
        context,
        "INVESTMENT_THESIS_CREATED"
    );

    return context;

}

export function setRecommendation(
    context,
    recommendation
) {

    context.recommendation =
        recommendation;

    addTimelineEvent(
        context,
        "RECOMMENDATION_CREATED"
    );

    return context;

}

export function setEntryValidation(
    context,
    validation
) {

    context.entryValidation = validation;

    addTimelineEvent(
        context,
        "ENTRY_VALIDATION_UPDATED"
    );

    return context;

}

export function setProtectionStrategy(
    context,
    strategy
) {

    context.protectionStrategy = strategy;

    addTimelineEvent(
        context,
        "PROTECTION_STRATEGY_UPDATED"
    );

    return context;

}

// ==========================================================
// Exit Decision
// ==========================================================

export function setExitDecision(
    context,
    exitDecision
) {

    context.exitDecision = exitDecision;

    addTimelineEvent(
        context,
        "EXIT_DECISION_CREATED"
    );

    return context;

}

export function setExitDecision(
    context,
    exitDecision
) {

    context.exitDecision = exitDecision;

    addTimelineEvent(
        context,
        "EXIT_DECISION_CREATED"
    );

    return context;

}

export function setPositionHealth(
    context,
    health
) {

    context.positionHealth = health;

    addTimelineEvent(
        context,
        "POSITION_HEALTH_UPDATED"
    );

    return context;

}

export function setConviction(
    context,
    conviction
) {

    context.conviction = conviction;

    addTimelineEvent(
        context,
        "CONVICTION_UPDATED"
    );

    return context;

}

export function setExitReadiness(
    context,
    readiness
) {

    context.exitReadiness =
        readiness;

    addTimelineEvent(
        context,
        "EXIT_READINESS_UPDATED"
    );

    return context;

}

export function setConfidence(
    context,
    confidence
) {

    context.confidence =
        confidence;

    addTimelineEvent(
        context,
        "CONFIDENCE_UPDATED"
    );

    return context;

}

// ==========================================================
// Run Engine
// ==========================================================

export async function runEngine(
    context,
    engine,
    executor,
    critical = false
) {

    startEngineTimer(
        context,
        engine
    );

    try {

        const result =
            await executor();

        if (result?.analysis) {

            addAnalysis(

                context,

                engine,

                result.analysis

            );

        }

        if (result?.evidence) {

            addEvidence(

                context,

                engine,

                result.evidence

            );

        }

        stopEngineTimer(

            context,

            engine,

            true

        );

        return result;

    }

    catch (error) {

        markEngineFailed(

            context,

            engine,

            error

        );

        stopEngineTimer(

            context,

            engine,

            false

        );

        if (critical) {

            throw error;

        }

        return {

            analysis: null,

            evidence: null,

            error,

        };

    }

}


// ==========================================================
// Validation
// ==========================================================

export function validateContext(
    context
) {

    if (!context) {

        throw new Error(
            "AI Context is required."
        );

    }

    if (!context.user) {

        throw new Error(
            "AI Context missing user."
        );

    }

    if (!context.token) {

        throw new Error(
            "AI Context missing token."
        );

    }

    if (!context.trade) {

        throw new Error(
            "AI Context missing trade."
        );

    }

    return true;

}

// ==========================================================
// Deep Freeze Helper
// ==========================================================

function deepFreeze(
    object
) {

    if (
        object === null ||
        typeof object !== "object"
    ) {

        return object;

    }

    Object.getOwnPropertyNames(object)
        .forEach((name) => {

            deepFreeze(
                object[name]
            );

        });

    return Object.freeze(
        object
    );

}

// ==========================================================
// Freeze Context
// ==========================================================

export function freezeContext(
    context
) {

    updateLifecycle(

        context,

        "COMPLETED",

        "FINISHED"

    );

    setFlag(
        context,
        "completed",
        true
    );

    setFlag(
        context,
        "frozen",
        true
    );

    addTimelineEvent(

        context,

        "CONTEXT_FROZEN"

    );

    deepFreeze(context);

    return context;

}