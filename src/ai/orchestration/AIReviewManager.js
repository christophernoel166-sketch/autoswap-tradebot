/**
 * ==========================================================
 * AIReviewManager
 * ==========================================================
 *
 * Coordinates when the AI decision pipeline should run.
 *
 * Responsibilities
 * ----------------
 * ✔ Receive market events
 * ✔ Queue incoming events
 * ✔ Merge related events
 * ✔ Remove duplicate events
 * ✔ Classify priority
 * ✔ Determine review type
 * ✔ Apply cooldown rules
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Buy
 * ✘ Sell
 * ✘ Calculate indicators
 * ✘ Save MongoDB
 *
 * ==========================================================
 */

import {

    addDebug,

} from "../core/AIContextUtils.js";

// ==========================================================
// Event Priorities
// ==========================================================

const PRIORITY = Object.freeze({

    LOW: "LOW",

    NORMAL: "NORMAL",

    HIGH: "HIGH",

    CRITICAL: "CRITICAL",

    EMERGENCY: "EMERGENCY",

});

// ==========================================================
// Review Types
// ==========================================================

const REVIEW = Object.freeze({

    QUICK: "QUICK",

    STANDARD: "STANDARD",

    FULL: "FULL",

    EMERGENCY: "EMERGENCY",

});

// ==========================================================
// Cooldowns
// ==========================================================

const COOLDOWN = Object.freeze({

    LOW: 60,

    NORMAL: 30,

    HIGH: 10,

    CRITICAL: 3,

    EMERGENCY: 0,

});

// ==========================================================
// Queue Window
// ==========================================================

const QUEUE_WINDOW_MS = 2000;

// ==========================================================
// Helpers
// ==========================================================

function now() {

    return Date.now();

}

function getEvents(
    context
) {

    if (

        !Array.isArray(

            context.reviewEvents

        )

    ) {

        context.reviewEvents = [];

    }

    return context.reviewEvents;

}

// ==========================================================
// Queue Event
// ==========================================================

function queueEvent(
    context,
    event
) {

    getEvents(context).push({

        ...event,

        timestamp:

            now(),

    });

}

// ==========================================================
// Remove Duplicates
// ==========================================================

function removeDuplicateEvents(
    events
) {

    const seen = new Set();

    return events.filter(

        event => {

            const key =

                `${event.type}:${event.source}`;

            if (

                seen.has(key)

            ) {

                return false;

            }

            seen.add(key);

            return true;

        }

    );

}

// ==========================================================
// Merge Events
// ==========================================================

function mergeEvents(
    events
) {

    return removeDuplicateEvents(

        events

    );

}

// ==========================================================
// Priority
// ==========================================================

function determinePriority(
    events
) {

    if (

        events.some(

            e =>

                e.priority ===

                PRIORITY.EMERGENCY

        )

    ) {

        return PRIORITY.EMERGENCY;

    }

    if (

        events.some(

            e =>

                e.priority ===

                PRIORITY.CRITICAL

        )

    ) {

        return PRIORITY.CRITICAL;

    }

    if (

        events.some(

            e =>

                e.priority ===

                PRIORITY.HIGH

        )

    ) {

        return PRIORITY.HIGH;

    }

    if (

        events.some(

            e =>

                e.priority ===

                PRIORITY.NORMAL

        )

    ) {

        return PRIORITY.NORMAL;

    }

    return PRIORITY.LOW;

}

// ==========================================================
// Review Type
// ==========================================================

function determineReviewType(
    priority
) {

    switch (

        priority

    ) {

        case PRIORITY.EMERGENCY:

            return REVIEW.EMERGENCY;

        case PRIORITY.CRITICAL:

            return REVIEW.FULL;

        case PRIORITY.HIGH:

            return REVIEW.STANDARD;

        default:

            return REVIEW.QUICK;

    }

}

// ==========================================================
// Cooldown Check
// ==========================================================

function checkCooldown(
    context,
    priority
) {

    const seconds =

        COOLDOWN[priority] ?? 30;

    if (

        seconds === 0

    ) {

        return false;

    }

    const lastReview =

        context.lastAIReviewAt ??

        0;

    return (

        now() - lastReview

    ) < (

        seconds * 1000

    );

}

// ==========================================================
// Execution Plan
// ==========================================================
function determineExecutionPlan(
    reviewType,
    events
) {

    const eventTypes =

        new Set(

            events.map(

                event => event.type

            )

        );

    // ======================================================
    // Emergency
    // ======================================================

    if (

        reviewType === REVIEW.EMERGENCY

    ) {

        return [

            "InvestmentThesisBuilder",

            "RecommendationEngine",

            "EntryValidationEngine",

            "PositionIntelligenceEngine",

            "ProtectionStrategyEngine",

            "AIExitEngine",

        ];

    }

   // ======================================================
// Take Profit Reached
// ======================================================

if (

    eventTypes.has("TP1_REACHED") ||

    eventTypes.has("TP2_REACHED") ||

    eventTypes.has("TP3_REACHED")

) {

    return [

        "PositionIntelligenceEngine",

        "ProtectionStrategyEngine",

        "AIExitEngine",

    ];

}

    // ======================================================
    // Whale Activity
    // ======================================================

    if (

        eventTypes.has("WHALE_BUY") ||

        eventTypes.has("WHALE_SELL")

    ) {

        return [

            "RecommendationEngine",

            "PositionIntelligenceEngine",

            "ProtectionStrategyEngine",

            "AIExitEngine",

        ];

    }

    // ======================================================
    // Liquidity / Momentum
    // ======================================================

    if (

        eventTypes.has("LIQUIDITY_CHANGE") ||

        eventTypes.has("MOMENTUM_CHANGE")

    ) {

        return [

            "RecommendationEngine",

            "PositionIntelligenceEngine",

            "ProtectionStrategyEngine",

            "AIExitEngine",

        ];

    }

    // ======================================================
    // New Position
    // ======================================================

    if (

        eventTypes.has("NEW_POSITION")

    ) {

        return [

            "InvestmentThesisBuilder",

            "RecommendationEngine",

            "EntryValidationEngine",

            "PositionIntelligenceEngine",

            "ProtectionStrategyEngine",

            "AIExitEngine",

        ];

    }

    // ======================================================
    // Default
    // ======================================================

    return [

        "PositionIntelligenceEngine",

        "ProtectionStrategyEngine",

        "AIExitEngine",

    ];

}

// ==========================================================
// Build Review Request
// ==========================================================

function buildReviewRequest(
    context
) {

    const events = mergeEvents(

        getEvents(context)

    );

    const priority =

        determinePriority(

            events

        );

    const reviewType =

        determineReviewType(

            priority

        );

    const cooldownApplied =

        checkCooldown(

            context,

            priority

        );

    const reviewRequired =

        !cooldownApplied ||

        priority === PRIORITY.EMERGENCY;

const executionPlan =

    determineExecutionPlan(

        reviewType,

        events

    );

    return {

        reviewRequired,

        reviewType,

        priority,
executionPlan,
        events,

        eventTimeline:

            events.map(

                event => ({

                    type:

                        event.type,

                    source:

                        event.source,

                    priority:

                        event.priority,

                    reason:

                        event.reason,

                    timestamp:

                        event.timestamp,

                })

            ),

        cooldownApplied,

        generatedAt:

            new Date(),

        engine:

            "AIReviewManager",

        version:

            "1.0.0",

    };

}

// ==========================================================
// Dispatch Review
// ==========================================================

function dispatchReview(
    context,
    review
) {

    if (

        !review.reviewRequired

    ) {

        return context;

    }

    context.pendingReview =

        review;

    context.lastAIReviewAt =

        Date.now();

    return context;

}

// ==========================================================
// Run Review Manager
// ==========================================================

export function runAIReviewManager(
    context,
    event
) {

    if (

        !context

    ) {

        throw new Error(

            "AIReviewManager: context is required."

        );

    }

    if (

        event

    ) {

        queueEvent(

            context,

            event

        );

    }

    const review =

        buildReviewRequest(

            context

        );

    dispatchReview(

        context,

        review

    );

    addDebug(

        context,

        "AI review evaluated.",

        {

            reviewRequired:

                review.reviewRequired,

            reviewType:

                review.reviewType,

            priority:

                review.priority,

            eventCount:

                review.events.length,

            cooldownApplied:

                review.cooldownApplied,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    runAIReviewManager,

};