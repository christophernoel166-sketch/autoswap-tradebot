import mongoose from "mongoose";

const TokenOutcomeSchema = new mongoose.Schema(
  {
    // =====================================================
    // TOKEN IDENTIFICATION
    // =====================================================

    mintAddress: {
      type: String,
      required: true,
      trim: true,
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
    // SOURCE INFORMATION
    // =====================================================

    source: {
      type: String,
      default: "manual_scan",
      index: true,
    },

    walletAddress: {
      type: String,
      default: null,
      index: true,
    },

    // =====================================================
    // SCAN TIMING
    // =====================================================

    scannedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // =====================================================
    // ENTRY PRICE
    // =====================================================

    entryPriceUsd: {
      type: Number,
      default: null,
    },

    // =====================================================
    // MARKET METRICS
    // =====================================================

    ageMinutes: Number,
    liquidityUsd: Number,
    marketCapUsd: Number,
    volume5mUsd: Number,
    buys5m: Number,
    sells5m: Number,

    // =====================================================
    // HOLDER METRICS
    // =====================================================

    largestHolderPercent: Number,
    top10HoldingPercent: Number,

    // =====================================================
    // WALLET INTELLIGENCE
    // =====================================================

    smartDegenCount: Number,
    botDegenCount: Number,
    ratTraderCount: Number,
    alphaCallerCount: Number,
    sniperWalletCount: Number,

    // =====================================================
    // PROFIT WALLET METRICS
    // =====================================================

    profitableWalletCount: Number,
    walletQualityScore: Number,
    profitWalletConfidence: Number,

    // =====================================================
    // MOMENTUM
    // =====================================================

    momentumScore: Number,
    velocityBreakoutScore: Number,

    // =====================================================
    // MARKET INTEGRITY
    // =====================================================

    walletParticipationScore: Number,
    velocitySanityScore: Number,
    washTradingRiskScore: Number,
    bundleSuspicionScore: Number,

    artificialVolumeFlag: {
      type: Boolean,
      default: false,
    },

    fakeMomentumFlag: {
      type: Boolean,
      default: false,
    },

    // =====================================================
    // RISK STRUCTURE
    // =====================================================

    bundleScore: Number,
    bundledWalletCount: Number,
    fundingClusterScore: Number,
    largestFundingCluster: Number,

    // =====================================================
    // RUG RISK
    // =====================================================

    devDumpRiskScore: Number,
    liquidityPullRiskScore: Number,
    insiderRiskScore: Number,
    rugRiskScore: Number,

    // =====================================================
    // FORECAST
    // =====================================================

    forecastScore: Number,

    forecastVerdict: {
      type: String,
      default: null,
    },

overallConfidence: {
  type: Number,
  default: null,
},

// =====================================================
// AI SNAPSHOT
// =====================================================

aiSnapshot: {
  confidence: {
    type: Number,
    default: null,
  },

  recommendation: {
    type: String,
    default: null,
  },

  executionProfile: {
    type: String,
    default: null,
  },

  strategy: {
    type: String,
    default: null,
  },

  reasoning: {
    type: [String],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  pipelineVersion: {
    type: String,
    default: "v2",
  },
},

// =====================================================
// ENTRY ANALYSIS
// =====================================================

entryAnalysis: {
  chart: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  forecast: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  momentum: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  liquidity: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  volume: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  walletIntelligence: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  holders: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  rugRisk: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  integrity: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
},

    // =====================================================
    // PRICE SNAPSHOTS
    // =====================================================

    price15m: {
      type: Number,
      default: null,
    },

    price1h: {
      type: Number,
      default: null,
    },

    price6h: {
      type: Number,
      default: null,
    },

    // In development this currently stores the
    // 3-hour checkpoint. Later it can be switched
    // back to true 24-hour tracking.
    price24h: {
      type: Number,
      default: null,
    },

    // =====================================================
    // RETURNS (%)
    // =====================================================

    return15m: {
      type: Number,
      default: null,
    },

    return1h: {
      type: Number,
      default: null,
    },

    return6h: {
      type: Number,
      default: null,
    },

    return24h: {
      type: Number,
      default: null,
    },

    // =====================================================
    // AI LEARNING METRICS
    // =====================================================

    peakReturn: {
      type: Number,
      default: null,
    },

    peakCheckpoint: {
      type: String,
      enum: ["15m", "1h", "6h", "3h", "24h", null],
      default: null,
    },

// =====================================================
// TRADE OUTCOME
// =====================================================

tradeOutcome: {
  exitPriceUsd: {
    type: Number,
    default: null,
  },

  highestPriceUsd: {
    type: Number,
    default: null,
  },

  lowestPriceUsd: {
    type: Number,
    default: null,
  },

  highestReturn: {
    type: Number,
    default: null,
  },

  lowestReturn: {
    type: Number,
    default: null,
  },

peakPriceUsd: {
  type: Number,
  default: null,
},

peakReachedAt: {
  type: Date,
  default: null,
},

minutesToPeak: {
  type: Number,
  default: null,
},

minutesFromPeakToCollapse: {
  type: Number,
  default: null,
},

collapsePercent: {
  type: Number,
  default: null,
},


  maxDrawdown: {
    type: Number,
    default: null,
  },

  holdMinutes: {
    type: Number,
    default: null,
  },

  exitReason: {
    type: String,
    default: null,
  },

  exitConfidence: {
    type: Number,
    default: null,
  },

closedAt: {
  type: Date,
  default: null,
},

realizedPnLPercent: {
  type: Number,
  default: null,
},
},

    // =====================================================
    // FINAL LABEL
    // =====================================================

    label: {
      type: String,
      enum: [
        "PENDING",
        "MOONSHOT",
        "WINNER",
        "NEUTRAL",
        "LOSER",
        "RUG_OR_FAILURE",
      ],
      default: "PENDING",
      index: true,
    },



    // =====================================================
    // TRACKING STATUS
    // =====================================================

    trackingComplete: {
      type: Boolean,
      default: false,
      index: true,
    },

// =====================================================
// LEARNING METADATA
// =====================================================

learning: {
  patternId: {
    type: String,
    default: null,
    index: true,
  },

  confidenceBucket: {
    type: String,
    default: null,
  },

  marketRegime: {
    type: String,
    default: null,
  },

  usedForTraining: {
    type: Boolean,
    default: false,
    index: true,
  },

  trainedAt: {
    type: Date,
    default: null,
  },
},

    // =====================================================
    // OPTIONAL METADATA
    // =====================================================

    scannerVersion: {
      type: String,
      default: "v1",
    },

    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "tokenoutcomes",
  }
);

// =====================================================
// INDEXES
// =====================================================

TokenOutcomeSchema.index({
  mintAddress: 1,
  scannedAt: -1,
});

TokenOutcomeSchema.index({
  trackingComplete: 1,
  scannedAt: 1,
});

TokenOutcomeSchema.index({
  forecastScore: -1,
});

TokenOutcomeSchema.index({
  overallConfidence: -1,
});

TokenOutcomeSchema.index({
  rugRiskScore: 1,
});

TokenOutcomeSchema.index({
  peakReturn: -1,
});

TokenOutcomeSchema.index({
  "learning.patternId": 1,
});

const TokenOutcome =
  mongoose.models.TokenOutcome ||
  mongoose.model("TokenOutcome", TokenOutcomeSchema);

export default TokenOutcome;