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

    ageMinutes: Number,
    liquidityUsd: Number,
    marketCapUsd: Number,
    volume5mUsd: Number,
    buys5m: Number,
    sells5m: Number,
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