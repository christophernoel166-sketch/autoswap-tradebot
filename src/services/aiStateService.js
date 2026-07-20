import { emitToRoom } from "./socketService.js";

const aiStates = new Map();
const pendingFlushes = new Map();

const FLUSH_DELAY_MS = 75;

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
        throw new Error("walletAddress is required.");
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
// PRIVATE EMITTER
// =====================================================

function emitState(walletAddress, event, payload) {
    let pending = pendingFlushes.get(walletAddress);

    if (!pending) {
        pending = {
            events: {},
            timer: null,
        };

        pendingFlushes.set(walletAddress, pending);
    }

    pending.events[event] = payload;

    if (pending.timer) {
        return;
    }

    pending.timer = setTimeout(() => {
        const batch = pending.events;

        Object.entries(batch).forEach(([name, data]) => {
    emitToRoom(
        `wallet:${walletAddress}`,
        name,
        data
    );
});

// Always synchronize the complete AI state
emitToRoom(
    `wallet:${walletAddress}`,
    "ai_state",
    getState(walletAddress)
);

pending.events = {};
pending.timer = null;

    }, FLUSH_DELAY_MS);
}

// =====================================================
// PUBLIC API
// =====================================================

export function getAIState(walletAddress) {
    return getState(walletAddress);
}

export function resetAIState(walletAddress) {
    aiStates.set(
        walletAddress,
        createDefaultState(walletAddress)
    );

    emitState(
        walletAddress,
        "ai_reset",
        getState(walletAddress)
    );

    return getState(walletAddress);
}

// =====================================================
// MULTI SECTION UPDATE
// =====================================================

export function updateMultiple(walletAddress, updates) {
    const state = getState(walletAddress);

    if (updates.system) {
        state.system = {
            ...state.system,
            ...updates.system,
            lastUpdate: Date.now(),
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

export function updateSystem(walletAddress, updates) {
    const state = getState(walletAddress);

    const nextSystem = {
        ...state.system,
        ...updates,
        lastUpdate: Date.now(),
    };

    const changed = Object.keys(updates).some(
        (key) => state.system[key] !== nextSystem[key]
    );

    if (!changed) {
        return state.system;
    }

    state.system = nextSystem;

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

export function updatePortfolio(walletAddress, updates) {
    const state = getState(walletAddress);

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

export function updateMarket(walletAddress, updates) {
    const state = getState(walletAddress);

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

export function updatePipeline(walletAddress, updates) {
    const state = getState(walletAddress);

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

export function updatePositions(walletAddress, updates) {
    const state = getState(walletAddress);

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

export function updateDiagnostics(walletAddress, updates) {
    const state = getState(walletAddress);

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

export function updateAnalysis(walletAddress, updates) {
    const state = getState(walletAddress);

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

export function updateLearning(walletAddress, updates) {
    const state = getState(walletAddress);

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

export function addActivity(walletAddress, activity) {
    const state = getState(walletAddress);

    state.activity.unshift({
        timestamp: Date.now(),
        ...activity,
    });

    if (state.activity.length > 100) {
        state.activity.length = 100;
    }

    emitState(
        walletAddress,
        "ai_activity",
        state.activity
    );

    return state.activity;
}