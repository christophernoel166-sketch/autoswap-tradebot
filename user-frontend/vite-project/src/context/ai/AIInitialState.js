// src/context/ai/AIInitialState.js

export const initialAIState = {
  system: {
    status: "OFFLINE",
    health: "UNKNOWN",
    version: null,
    uptime: null,
    currentTask: null,
    lastUpdate: null,
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

    sentiment: "UNKNOWN",

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

  learning: {
    totalPredictions: 0,
    successfulPredictions: 0,
    failedPredictions: 0,
    learningCycles: 0,
    lastLearningAt: null,
  },

  activity: [],

  diagnostics: {
    rpcLatency: null,
    rpcStatus: "UNKNOWN",

    redisStatus: "UNKNOWN",

    dexScreenerStatus: "UNKNOWN",

    apiHealth: "UNKNOWN",

    queueDepth: 0,
    activeWorkers: 0,

    lastSuccessfulScan: null,

    // Frontend connection diagnostics
    socketConnected: false,
    reconnecting: false,
    latency: null,
    lastHeartbeat: null,
  },
};