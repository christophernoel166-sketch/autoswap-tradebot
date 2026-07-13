// =====================================================
// AUTOSWAPS AI CONFIGURATION
// Central brain configuration for every AI module.
// =====================================================

// =====================================================
// ENGINE VERSIONS
// =====================================================

export const AI_ENGINE_VERSION = {

    POSITION_INTELLIGENCE: "1.0.0",

    FORECAST: "1.0.0",

    HOLDERS: "1.0.0",

    LIQUIDITY: "1.0.0",

    MOMENTUM: "1.0.0",

    WALLET_INTELLIGENCE: "1.0.0",

    CHART: "1.0.0",

    RISK: "1.0.0",

};

// =====================================================
// AI STATUS
// =====================================================

export const AI_STATUS = {

    VERY_BULLISH: "VERY_BULLISH",

    BULLISH: "BULLISH",

    NEUTRAL: "NEUTRAL",

    BEARISH: "BEARISH",

    VERY_BEARISH: "VERY_BEARISH",

    UNKNOWN: "UNKNOWN",

};

// =====================================================
// HEALTH TREND
// =====================================================

export const AI_TREND = {

    STRONGLY_IMPROVING: "STRONGLY_IMPROVING",

    IMPROVING: "IMPROVING",

    STABLE: "STABLE",

    WEAKENING: "WEAKENING",

    STRONGLY_WEAKENING: "STRONGLY_WEAKENING",

};

// =====================================================
// POSITION RECOMMENDATION
// =====================================================

export const AI_RECOMMENDATION = {

    STRONG_HOLD: "STRONG_HOLD",

    HOLD: "HOLD",

    WATCH: "WATCH",

    PROTECT: "PROTECT",

    REDUCE_RISK: "REDUCE_RISK",

    EXIT: "EXIT",

};

// =====================================================
// POSITION HEALTH LEVELS
// =====================================================

export const POSITION_HEALTH = {

    EXCELLENT: {

        min: 90,

        max: 100,

    },

    HEALTHY: {

        min: 75,

        max: 89,

    },

    WEAKENING: {

        min: 60,

        max: 74,

    },

    HIGH_RISK: {

        min: 40,

        max: 59,

    },

    CRITICAL: {

        min: 20,

        max: 39,

    },

    EXIT: {

        min: 0,

        max: 19,

    },

};

// =====================================================
// RECOVERY CONFIGURATION
// =====================================================

export const RECOVERY_CONFIG = {

    minimumConsecutiveImprovingScans: 3,

    minimumHealthIncrease: 10,

    minimumConfidence: 80,

};

// =====================================================
// NOTIFICATION CONFIGURATION
// =====================================================

export const NOTIFICATION_CONFIG = {

    minimumHealthDrop: 10,

    minimumHealthIncrease: 10,

    notifyRecommendationChange: true,

    notifyRecovery: true,

    notifyCriticalHealth: true,

    cooldownMinutes: 10,

};

// =====================================================
// ADAPTIVE PROTECTION
// Future AI Exit System
// =====================================================

export const ADAPTIVE_PROTECTION = {

    100: 12,

    90: 10,

    80: 8,

    70: 6,

    60: 5,

    50: 4,

    40: 3,

    30: 2,

    20: 1,

};

// =====================================================
// ENGINE WEIGHTS
// Must equal 1.00
// =====================================================

export const ENGINE_WEIGHTS = {

    liquidity: 0.16,

    holders: 0.15,

    wallets: 0.18,

    momentum: 0.16,

    volume: 0.12,

    chart: 0.10,

    forecast: 0.08,

    risk: 0.05,

};

// =====================================================
// SCAN INTERVALS
// =====================================================

export const AI_SCAN_INTERVALS = {

    POSITION_SCAN_SECONDS: 30,

    HOLDER_REFRESH_SECONDS: 60,

    WALLET_REFRESH_SECONDS: 60,

    CHART_REFRESH_SECONDS: 30,

};

// =====================================================
// SNAPSHOT SETTINGS
// =====================================================

export const SNAPSHOT_CONFIG = {

    VERSION: 1,

    KEEP_INTELLIGENCE_HISTORY_DAYS: 365,

};

// =====================================================
// LEARNING SETTINGS
// Future Version
// =====================================================

export const LEARNING_CONFIG = {

    ENABLED: false,

    MINIMUM_TRAINING_SAMPLES: 500,

    REBUILD_PATTERN_STATS_DAILY: true,

};