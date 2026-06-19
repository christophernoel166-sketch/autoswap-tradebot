import mongoose from "mongoose";

const PatternStatsSchema = new mongoose.Schema(
  {
    // =====================================================
    // UNIQUE PATTERN KEY
    // =====================================================
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // =====================================================
    // SAMPLE COUNTS
    // =====================================================
    samples: {
      type: Number,
      default: 0,
      min: 0,
    },

    winners: {
      type: Number,
      default: 0,
      min: 0,
    },

    moonshots: {
      type: Number,
      default: 0,
      min: 0,
    },

    losers: {
      type: Number,
      default: 0,
      min: 0,
    },

    neutrals: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =====================================================
    // PERFORMANCE METRICS
    // =====================================================
    winRate: {
      type: Number,
      default: 0,
    },

    moonshotRate: {
      type: Number,
      default: 0,
    },

    averageReturn24h: {
      type: Number,
      default: 0,
    },

    medianReturn24h: {
      type: Number,
      default: 0,
    },

    bestReturn24h: {
      type: Number,
      default: 0,
    },

    worstReturn24h: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // AI CONFIDENCE
    // =====================================================
    confidenceScore: {
      type: Number,
      default: 0,
      index: true,
    },

    // =====================================================
    // BUCKET INFORMATION
    // =====================================================
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Example:
    // {
    //   momentumBucket: "VERY_HIGH",
    //   rugRiskBucket: "VERY_SAFE",
    //   walletBucket: "VERY_HIGH",
    //   forecastBucket: "HIGH"
    // }

    // =====================================================
    // LAST REBUILD
    // =====================================================
    lastComputedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "patternstats",
  }
);

// =====================================================
// INDEXES
// =====================================================

PatternStatsSchema.index({
  confidenceScore: -1,
});

PatternStatsSchema.index({
  winRate: -1,
});

PatternStatsSchema.index({
  samples: -1,
});

const PatternStats =
  mongoose.models.PatternStats ||
  mongoose.model(
    "PatternStats",
    PatternStatsSchema
  );

export default PatternStats;