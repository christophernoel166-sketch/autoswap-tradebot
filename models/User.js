import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ===================================================
    // 🆔 WALLET (PRIMARY LOGIN ID)
    // ===================================================
    walletAddress: {
      type: String,
      required: true,
      index: true, // ❌ NOT unique (intentionally)
    },

    // ===================================================
    // 💰 AUTOSNIPE-STYLE CUSTODY (STEP 2.1)
    // ===================================================
    balanceSol: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockedBalanceSol: {
      type: Number,
      default: 0,
      min: 0,
    },

    tradingEnabled: {
      type: Boolean,
      default: false, // 🔒 user must explicitly enable trading
    },

    // ===================================================
    // 🔐 CUSTODY SAFETY
    // Withdrawals ONLY go here
    // ===================================================
    depositWallet: {
      type: String, // original Phantom wallet
      index: true,
    },

    // ===================================================
    // TELEGRAM IDENTITY (ONE TELEGRAM → ONE WALLET)
    // ===================================================
    telegram: {
      userId: {
        type: String,
        unique: true, // ✅ ENFORCES 1 TELEGRAM = 1 WALLET
        sparse: true, // ✅ allows users without Telegram yet
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

      // One-time wallet ↔ telegram linking code
      linkCode: {
        type: String,
        index: true,
      },
    },

    // ===================================================
    // CHANNEL SUBSCRIPTIONS (MANY CHANNELS PER USER)
    // ===================================================
    subscribedChannels: {
      type: [
        {
          channelId: {
            type: String,
            required: true, // -100xxxx
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
    // 📊 TRADING PARAMETERS (UNCHANGED)
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

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    strict: false, // 👈 preserves backward compatibility
  }
);

/**
 * IMPORTANT GUARANTEES
 * ---------------------------------------------------
 * - walletAddress = login identity
 * - depositWallet = immutable withdrawal destination
 * - balanceSol / lockedBalanceSol = custodial funds
 * - tradingEnabled = manual user consent
 * - telegram.userId is UNIQUE (1 Telegram → 1 wallet)
 */

export default mongoose.model("User", userSchema);
