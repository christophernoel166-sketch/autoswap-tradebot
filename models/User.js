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
