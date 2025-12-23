import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ===================================================
    // WALLET (PRIMARY LOGIN ID)
    // ===================================================
    walletAddress: {
      type: String,
      required: true,
      index: true, // ✅ single non-unique index
    },

    // ===================================================
    // LEGACY TELEGRAM ID (backward compatibility)
    // ===================================================
    telegramId: {
      type: String,
      default: null,
    },

    // ===================================================
    // TELEGRAM IDENTITY (STEP 4)
    // Used for channel approval & UX
    // ===================================================
    telegram: {
      userId: {
        type: String,
        index: true, // ✅ indexed ONCE here
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
        index: true, // ✅ indexed ONCE here
      },
    },

    // ===================================================
    // CHANNEL SUBSCRIPTIONS (USER TOGGLE + APPROVAL FLOW)
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
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },

          requestedAt: {
            type: Date,
            default: Date.now,
          },

          approvedAt: {
            type: Date,
          },
        },
      ],
      default: [],
    },

    // ===================================================
    // TRADING PARAMETERS
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
    strict: false,
  }
);

/**
 * ❗ IMPORTANT
 * - NO schema.index() calls here
 * - All indexes are defined at field level
 * - This prevents duplicate index warnings
 */

export default mongoose.model("User", userSchema);
