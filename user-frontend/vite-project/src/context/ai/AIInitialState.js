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
    risk: "UNKNOWN",
    protected: 0,
    watching: 0,
    exitCandidates: 0,
    totalPositions: 0,
    activeTrades: 0,
    decisionsToday: 0,
  },

  market: {
    mode: "UNKNOWN",
    sentiment: "UNKNOWN",
    volatility: "UNKNOWN",
    liquidity: "UNKNOWN",
    trend: "UNKNOWN",
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

  activity: [],

  diagnostics: {
    socketConnected: false,
    reconnecting: false,
    latency: null,
    lastHeartbeat: null,
  },
};