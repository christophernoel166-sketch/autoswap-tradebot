// src/services/aiStateService.js

import { redis } from "../utils/redis.js";

// =====================================================
// AI STATE STORE
// =====================================================
//
// This service runs inside the BOT SERVICE.
//
// IMPORTANT:
// The Bot Service does NOT own the Socket.IO server.
// Therefore it must NEVER call Socket.IO directly.
//
// Flow:
//
//   AI state
//      ↓
//   local state
//      ↓
//   75ms batching
//      ↓
//   Redis Pub/Sub
//      ↓
//   API Service
//      ↓
//   Socket.IO
//      ↓
//   Frontend
// =====================================================

const aiStates = new Map();
const pendingFlushes = new Map();

const FLUSH_DELAY_MS = 75;

// =====================================================
// REDIS PUB/SUB CHANNEL
// =====================================================

export const AI_STATE_CHANNEL =
    "autoswap:ai-state";

// =====================================================
// CREATE DEFAULT AI STATE
// =====================================================

function createDefaultState(walletAddress) {
    return {
        walletAddress,

        system: {
            status: "IDLE",
            health: "HEALTHY",
            version: "1.0.0",
            uptime: 0,
            currentTask: null,
            lastUpdate: Date.now(),
        },

        portfolio: {
            confidence: 0,
            health: "UNKNOWN",
            risk: "LOW",
            protected: 0,
            watching: 0,
            exitCandidates: 0,
            totalPositions: 0,
            activeTrades: 0,
            decisionsToday: 0,
            totalProfitUsd: 0,
            totalLossUsd: 0,
            realizedPnL: 0,
            unrealizedPnL: 0,
            exposure: 0,
            capitalAllocated: 0,
            winRate: 0,
            averageReturn: 0,
        },

        market: {
            mode: "UNKNOWN",
            sentiment: "NEUTRAL",
            volatility: "UNKNOWN",
            liquidity: "UNKNOWN",
            trend: "UNKNOWN",
            bullishTokens: 0,
            bearishTokens: 0,
            scanningTokens: 0,
            totalLiquidityUsd: 0,
            averageMomentum: 0,
            marketRisk: "UNKNOWN",
            fearGreed: null,
            hotNarrative: null,
            strongestSector: null,
        },

        pipeline: {
            active: false,
            stage: null,
            progress: 0,
            token: null,
            startedAt: null,
            estimatedCompletion: null,
        },

        positions: {
            healthy: 0,
            warning: 0,
            danger: 0,
            protected: 0,
            reviewing: 0,
        },

        diagnostics: {
            rpcLatency: null,
            rpcStatus: "UNKNOWN",
            redisStatus: "UNKNOWN",
            dexScreenerStatus: "UNKNOWN",
            apiHealth: "UNKNOWN",
            queueDepth: 0,
            activeWorkers: 0,
            lastSuccessfulScan: null,
        },

        analysis: {
            recommendation: null,
            confidence: 0,
            forecast: null,
            signalScore: null,
            evidence: {},
            reasoning: {},
            investmentThesis: {},
            aiVersion: "2.0",
            predictionAccuracy: 0,
            learnedPatterns: 0,
            confidenceTrend: "STABLE",
        },

        activity: [],

        learning: {
            totalPredictions: 0,
            successfulPredictions: 0,
            failedPredictions: 0,
            learningCycles: 0,
            lastLearningAt: null,
        },
    };
}

// =====================================================
// GET OR CREATE STATE
// =====================================================

function getState(walletAddress) {

    if (!walletAddress) {
        throw new Error(
            "walletAddress is required."
        );
    }

    if (!aiStates.has(walletAddress)) {

        aiStates.set(
            walletAddress,
            createDefaultState(walletAddress)
        );

    }

    return aiStates.get(walletAddress);
}

// =====================================================
// PUBLISH BATched EVENTS TO REDIS
// =====================================================

async function publishAIEvents(
    walletAddress,
    events,
    state
) {

    if (!walletAddress) {
        return false;
    }

    try {

        const message = JSON.stringify({

            walletAddress,

            events,

            state,

            timestamp:
                Date.now(),

        });


console.log(
    "\n============================================================"
);

console.log(
    "🔬 [AI STATE REDIS PUBLISH DIAGNOSTIC]"
);

console.log(
    "============================================================"
);

console.dir(
    {
        walletAddress,

        eventNames:
            events
                ? Object.keys(events)
                : [],

        analysis: {
            recommendation:
                state?.analysis?.recommendation,

            confidence:
                state?.analysis?.confidence,

            confidenceType:
                typeof state?.analysis?.confidence,
        },

        portfolio: {
            confidence:
                state?.portfolio?.confidence,

            confidenceType:
                typeof state?.portfolio?.confidence,
        },

        stateConfidenceComparison: {
            analysis:
                state?.analysis?.confidence,

            portfolio:
                state?.portfolio?.confidence,

            equal:
                state?.analysis?.confidence ===
                state?.portfolio?.confidence,
        },

        timestamp:
            Date.now(),
    },
    {
        depth: null,
        colors: true,
    }
);

console.log(
    "============================================================\n"
);


        await redis.publish(
            AI_STATE_CHANNEL,
            message
        );

        return true;

    } catch (err) {

        console.error(
            "❌ [AI State] Redis publish failed:",
            err?.message || err
        );

        return false;
    }
}

// =====================================================
// PRIVATE EMITTER
// =====================================================
//
// Collects updates for 75ms.
//
// Instead of Socket.IO:
//
//   emitToRoom()
//
// we now:
//
//   Redis PUBLISH
//
// =====================================================

function emitState(
    walletAddress,
    event,
    payload
) {

    let pending =
        pendingFlushes.get(
            walletAddress
        );

    if (!pending) {

        pending = {

            events: {},

            timer: null,

        };

        pendingFlushes.set(
            walletAddress,
            pending
        );
    }

    pending.events[event] =
        payload;

    if (pending.timer) {
        return;
    }

    pending.timer = setTimeout(
        async () => {

            const batch =
                pending.events;

            const state =
                getState(walletAddress);

            pending.events = {};

            pending.timer = null;

            pendingFlushes.delete(
                walletAddress
            );

            await publishAIEvents(
                walletAddress,
                batch,
                state
            );

        },
        FLUSH_DELAY_MS
    );
}

// =====================================================
// PUBLIC API
// =====================================================

export function getAIState(
    walletAddress
) {

    return getState(
        walletAddress
    );
}

// =====================================================
// RESET AI STATE
// =====================================================

export function resetAIState(
    walletAddress
) {

    aiStates.set(
        walletAddress,
        createDefaultState(
            walletAddress
        )
    );

    emitState(
        walletAddress,
        "ai_reset",
        getState(walletAddress)
    );

    return getState(
        walletAddress
    );
}

// =====================================================
// MULTI SECTION UPDATE
// =====================================================

export function updateMultiple(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    if (updates.system) {

        state.system = {

            ...state.system,

            ...updates.system,

            lastUpdate:
                Date.now(),

        };
    }

    if (updates.portfolio) {

        state.portfolio = {

            ...state.portfolio,

            ...updates.portfolio,

        };
    }

    if (updates.market) {

        state.market = {

            ...state.market,

            ...updates.market,

        };
    }

    if (updates.pipeline) {

        state.pipeline = {

            ...state.pipeline,

            ...updates.pipeline,

        };
    }

    if (updates.positions) {

        state.positions = {

            ...state.positions,

            ...updates.positions,

        };
    }

    if (updates.analysis) {

        state.analysis = {

            ...state.analysis,

            ...updates.analysis,

        };
    }

    if (updates.diagnostics) {

        state.diagnostics = {

            ...state.diagnostics,

            ...updates.diagnostics,

        };
    }

    if (updates.learning) {

        state.learning = {

            ...state.learning,

            ...updates.learning,

        };
    }





    emitState(
        walletAddress,
        "ai_state",
        state
    );

    return state;
}

// =====================================================
// SYSTEM
// =====================================================

export function updateSystem(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    const nextSystem = {

        ...state.system,

        ...updates,

        lastUpdate:
            Date.now(),

    };

    const changed =
        Object.keys(updates).some(
            (key) =>
                state.system[key] !==
                nextSystem[key]
        );

    if (!changed) {
        return state.system;
    }

    state.system =
        nextSystem;

    emitState(
        walletAddress,
        "ai_system",
        state.system
    );

    return state.system;
}

// =====================================================
// PORTFOLIO
// =====================================================

export function updatePortfolio(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    state.portfolio = {

        ...state.portfolio,

        ...updates,

    };

    emitState(
        walletAddress,
        "ai_portfolio",
        state.portfolio
    );

    return state.portfolio;
}

// =====================================================
// MARKET
// =====================================================

export function updateMarket(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    state.market = {

        ...state.market,

        ...updates,

    };

    emitState(
        walletAddress,
        "ai_market",
        state.market
    );

    return state.market;
}

// =====================================================
// PIPELINE
// =====================================================

export function updatePipeline(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    state.pipeline = {

        ...state.pipeline,

        ...updates,

    };

    emitState(
        walletAddress,
        "ai_pipeline",
        state.pipeline
    );

    return state.pipeline;
}

// =====================================================
// POSITION METRICS
// =====================================================

export function updatePositions(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    state.positions = {

        ...state.positions,

        ...updates,

    };

    emitState(
        walletAddress,
        "ai_positions",
        state.positions
    );

    return state.positions;
}

// =====================================================
// DIAGNOSTICS
// =====================================================

export function updateDiagnostics(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    state.diagnostics = {

        ...state.diagnostics,

        ...updates,

    };

    emitState(
        walletAddress,
        "ai_diagnostics",
        state.diagnostics
    );

    return state.diagnostics;
}

// =====================================================
// AI ANALYSIS
// =====================================================

export function updateAnalysis(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    state.analysis = {

        ...state.analysis,

        ...updates,

    };

    emitState(
        walletAddress,
        "ai_analysis",
        state.analysis
    );

    return state.analysis;
}

// =====================================================
// LEARNING
// =====================================================

export function updateLearning(
    walletAddress,
    updates
) {

    const state =
        getState(walletAddress);

    state.learning = {

        ...state.learning,

        ...updates,

    };

    emitState(
        walletAddress,
        "ai_learning",
        state.learning
    );

    return state.learning;
}

// =====================================================
// ACTIVITY FEED
// =====================================================

export function addActivity(
    walletAddress,
    activity
) {

    const state =
        getState(walletAddress);

    state.activity.unshift({

        timestamp:
            Date.now(),

        ...activity,

    });

    if (
        state.activity.length >
        100
    ) {

        state.activity.length =
            100;

    }

    emitState(
        walletAddress,
        "ai_activity",
        state.activity
    );

    return state.activity;
}