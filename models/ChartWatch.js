import mongoose from "mongoose";

const ChartWatchSchema = new mongoose.Schema(
  {
    // =====================================================
    // TOKEN IDENTIFICATION
    // =====================================================

    mintAddress: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    pairAddress: {
      type: String,
      default: null,
    },

    symbol: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      default: null,
    },

    // =====================================================
    // USER
    // =====================================================

    walletAddress: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // =====================================================
    // CHART SETUP
    // =====================================================

    setupType: {
      type: String,
      enum: [
        "BREAKOUT_SETUP",
        "PULLBACK_SETUP",
      ],
      required: true,
      index: true,
    },

    currentAction: {
      type: String,
      default: null,
    },

    previousAction: {
      type: String,
      default: null,
    },

    trend: {
      type: String,
      default: null,
    },

    confidence: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // ENTRY LEVELS
    // =====================================================

    entryMin: {
      type: Number,
      default: null,
    },

    entryMax: {
      type: Number,
      default: null,
    },

    breakoutLevel: {
      type: Number,
      default: null,
    },

    invalidationLevel: {
      type: Number,
      default: null,
    },

    takeProfitLevel: {
      type: Number,
      default: null,
    },

    // =====================================================
    // PRICE TRACKING
    // =====================================================

    initialPrice: {
      type: Number,
      default: null,
    },

    lastPrice: {
      type: Number,
      default: null,
    },

    highestPriceSeen: {
      type: Number,
      default: null,
    },

    lowestPriceSeen: {
      type: Number,
      default: null,
    },

    // =====================================================
    // AI METRICS
    // =====================================================

    forecastScore: {
      type: Number,
      default: null,
    },

    lastConfidence: {
      type: Number,
      default: null,
    },

    // =====================================================
    // ANALYSIS SNAPSHOT
    // =====================================================

    analysisSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // =====================================================
    // MONITORING
    // =====================================================

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "BUY_NOW",
        "INVALIDATED",
        "STOPPED",
        "EXPIRED",
      ],
      default: "ACTIVE",
      index: true,
    },

    monitorCount: {
      type: Number,
      default: 0,
    },

    lastCheckedAt: {
      type: Date,
      default: null,
    },

    startedMonitoringAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 60 * 60 * 1000),
    },

    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    notifyDashboard: {
      type: Boolean,
      default: true,
    },

    notifyTelegram: {
      type: Boolean,
      default: true,
    },

    dashboardNotified: {
      type: Boolean,
      default: false,
    },

    telegramNotified: {
      type: Boolean,
      default: false,
    },

    // =====================================================
    // AUTO TRADING
    // =====================================================

    autoTrade: {
      type: Boolean,
      default: false,
    },

    autoTradeExecuted: {
      type: Boolean,
      default: false,
    },

    // =====================================================
    // RESULT
    // =====================================================

    finalResult: {
      type: String,
      enum: [
        "BUY_TRIGGERED",
        "INVALIDATED",
        "EXPIRED",
        "STOPPED",
        null,
      ],
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // DEBUG
    // =====================================================

    lastReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "chartwatches",
  }
);

// =====================================================
// INDEXES
// =====================================================

ChartWatchSchema.index({
  walletAddress: 1,
  mintAddress: 1,
  status: 1,
});

ChartWatchSchema.index({
  status: 1,
  expiresAt: 1,
});

ChartWatchSchema.index({
  mintAddress: 1,
});

ChartWatchSchema.index({
  walletAddress: 1,
});

const ChartWatch =
  mongoose.models.ChartWatch ||
  mongoose.model(
    "ChartWatch",
    ChartWatchSchema
  );

export default ChartWatch;