import mongoose from "mongoose";

const DeveloperProfileSchema = new mongoose.Schema(

  {

    // =====================================================
    // Developer Identity
    // =====================================================

    developerWallet: {
      type: String,
      unique: true,
      index: true,
      required: true,
      trim: true,
    },

    // =====================================================
    // Activity
    // =====================================================

    tokensCreated: {
      type: Number,
      default: 0,
    },

    firstLaunch: {
      type: Date,
      default: Date.now,
    },

    lastLaunch: {
      type: Date,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    // =====================================================
    // Outcome Statistics
    // =====================================================

    successfulTokens: {
      type: Number,
      default: 0,
    },

    moonshots: {
      type: Number,
      default: 0,
    },

    neutralTokens: {
      type: Number,
      default: 0,
    },

    failedTokens: {
      type: Number,
      default: 0,
    },

    rugs: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // Performance Statistics
    // =====================================================

    averageROI: {
      type: Number,
      default: 0,
    },

    averagePeakReturn: {
      type: Number,
      default: 0,
    },

    averageATH: {
      type: Number,
      default: 0,
    },

    averageLifetimeHours: {
      type: Number,
      default: 0,
    },

    bestReturn: {
      type: Number,
      default: 0,
    },

    worstReturn: {
      type: Number,
      default: 0,
    },

    largestMoonshot: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // Success Metrics
    // =====================================================

    winRate: {
      type: Number,
      default: 0,
    },

    rugRate: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // AI Historical Learning
    // =====================================================

    averageForecast: {
      type: Number,
      default: 0,
    },

    averageAIScore: {
      type: Number,
      default: 0,
    },

    averageConsensus: {
      type: Number,
      default: 0,
    },

    averageTrustScore: {
      type: Number,
      default: 0,
    },

    averageAgreement: {
      type: Number,
      default: 0,
    },

    averageConfidence: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // Overall Developer Reputation
    // =====================================================

    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    reputation: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    developerConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // =====================================================
    // Recent Launch History
    // =====================================================

    recentLaunches: [

      {

        mint: String,

        symbol: String,

        launchedAt: Date,

        roi: Number,

        peakReturn: Number,

        ath: Number,

        lifetimeHours: Number,

        result: String,

        forecast: Number,

        aiScore: Number,

        consensus: Number,

        trustScore: Number,

        agreement: Number,

        confidence: Number,

      },

    ],

    // =====================================================
    // AI Notes
    // =====================================================

    notes: {
      type: [String],
      default: [],
    },

  },

  {

    timestamps: true,

  }

);

export default mongoose.model(
  "DeveloperProfile",
  DeveloperProfileSchema
);