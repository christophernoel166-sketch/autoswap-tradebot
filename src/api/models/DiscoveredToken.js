import mongoose from "mongoose";

const discoveredTokenSchema = new mongoose.Schema(
  {
    chainId: String,

    mintAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    pairAddress: String,
    dexId: String,

    name: String,
    symbol: String,
    icon: String,
    url: String,
    links: Array,

    // REAL pair creation timestamp from Dexscreener
    pairCreatedAt: Number,

    ageMinutes: Number,

    // Current metrics
    liquidityUsd: {
      type: Number,
      default: 0,
    },

    marketCapUsd: {
      type: Number,
      default: 0,
    },

    volume5mUsd: {
      type: Number,
      default: 0,
    },

    buys5m: {
      type: Number,
      default: 0,
    },

    sells5m: {
      type: Number,
      default: 0,
    },

    // Previous metrics (used for forecasting)
    previousLiquidityUsd: {
      type: Number,
      default: 0,
    },

    previousVolume5mUsd: {
      type: Number,
      default: 0,
    },

    previousBuys5m: {
      type: Number,
      default: 0,
    },

    previousSells5m: {
      type: Number,
      default: 0,
    },

    boosted: Boolean,

    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.DiscoveredToken ||
  mongoose.model("DiscoveredToken", discoveredTokenSchema);