import mongoose from "mongoose";

const TokenOutcomeSchema = new mongoose.Schema(
  {
    // =====================================================
    // TOKEN IDENTIFICATION
    // =====================================================
    mintAddress: {
      type: String,
      required: true,
      index: true,
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
  label: 1,
});

TokenOutcomeSchema.index({
  forecastScore: -1,
});

TokenOutcomeSchema.index({
  rugRiskScore: 1,
});

TokenOutcomeSchema.index({
  source: 1,
});

TokenOutcomeSchema.index({
  walletAddress: 1,
});

TokenOutcomeSchema.index({
  trackingComplete: 1,
});

const TokenOutcome =
  mongoose.models.TokenOutcome ||
  mongoose.model("TokenOutcome", TokenOutcomeSchema);

export default TokenOutcome;