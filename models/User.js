import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ===================================================
    // 🆔 WALLET (PRIMARY LOGIN ID)
    // ===================================================
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ===================================================
    // 🔐 PER-USER TRADING WALLET (NEW ARCHITECTURE)
    // ===================================================
    tradingWalletPublicKey: {
      type: String,
      index: true,
    },

    tradingWalletEncryptedPrivateKey: {
      type: String,
    },

    tradingWalletIv: {
      type: String,
    },

    tradingEnabled: {
      type: Boolean,
      default: false,
    },

    // ===================================================
    // TELEGRAM IDENTITY (ONE TELEGRAM → ONE WALLET)
    // ===================================================
    telegram: {
      userId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
      },

      username: {
        type: String,
      },

      firstName: {
        type: String,
      },

      linkedAt: {
        type: Date,
      },

      linkCode: {
        type: String,
        index: true,
      },
    },

    // ===================================================
    // CHANNEL SUBSCRIPTIONS
    // ===================================================
    subscribedChannels: {
      type: [
        {
          channelId: {
            type: String,
            required: true,
          },

          enabled: {
            type: Boolean,
            default: true,
          },

          status: {
            type: String,
            enum: ["pending", "approved", "rejected", "expired"],
            default: "pending",
          },

          requestedAt: {
            type: Date,
            default: Date.now,
          },

          approvedAt: {
            type: Date,
          },

          expiredAt: {
            type: Date,
          },
        },
      ],
      default: [],
    },

    // ===================================================
    // 📊 TRADING PARAMETERS
    // ===================================================
    solPerTrade: { type: Number, default: 0.01 },

    tp1: { type: Number, default: 10 },
    tp1SellPercent: { type: Number, default: 25 },

    tp2: { type: Number, default: 20 },
    tp2SellPercent: { type: Number, default: 35 },

    tp3: { type: Number, default: 30 },
    tp3SellPercent: { type: Number, default: 40 },

    stopLoss: { type: Number, default: 10 },

    trailingTrigger: { type: Number, default: 5 },
    trailingDistance: { type: Number, default: 3 },

    // ===================================================
    // 🔐 SLIPPAGE CONTROL
    // ===================================================
    maxSlippagePercent: {
      type: Number,
      default: 2,
      min: 0.1,
      max: 10,
    },

    slippageByChannel: {
      type: Map,
      of: Number,
    },

    // ===================================================
    // 🧪 CUSTOM CONDITION MODE
    // ===================================================
    customConditionMode: {
  type: Boolean,
  default: false,
},

tokenConditions: {
  market: {
    minLiquidityUsd: { type: Number, default: null },
    minMarketCapUsd: { type: Number, default: null },
    maxMarketCapUsd: { type: Number, default: null },
    minBuys5m: { type: Number, default: null },
    maxSells5m: { type: Number, default: null },
    minAgeMinutes: { type: Number, default: null },
    maxAgeMinutes: { type: Number, default: null },
  },

  holderSafety: {
    maxLargestHolderPercent: { type: Number, default: null },
    maxTop10HoldingPercent: { type: Number, default: null },
  },

  socials: {
    requireWebsite: { type: Boolean, default: false },
    requireTelegram: { type: Boolean, default: false },
    requireTwitter: { type: Boolean, default: false },
  },

  marketIntegrity: {
    minBuySellRatio5m: { type: Number, default: null },
    minWalletParticipationScore: { type: Number, default: null },
    minVelocitySanityScore: { type: Number, default: null },
    maxBundleSuspicionScore: { type: Number, default: null },
    maxBundledWalletCount: { type: Number, default: null },
    maxFundingClusterScore: { type: Number, default: null },
    allowFakeMomentum: { type: Boolean, default: true },
    allowArtificialVolume: { type: Boolean, default: true },
  },

  walletIntelligence: {
    minSmartDegenCount: { type: Number, default: null },
    maxBotDegenCount: { type: Number, default: null },
    maxRatTraderCount: { type: Number, default: null },
    minAlphaCallerCount: { type: Number, default: null },
    maxSniperWalletCount: { type: Number, default: null },
  },

  rugRisk: {
    maxRugRiskScore: { type: Number, default: null },
  },
},

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    strict: true,
  }
);

/**
 * IMPORTANT GUARANTEES
 * ---------------------------------------------------
 * - walletAddress = login identity
 * - tradingWalletPublicKey = real trading wallet
 * - NO custodial balance system anymore
 * - Blockchain becomes source of truth
 */

export default mongoose.model("User", userSchema);