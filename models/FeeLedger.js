// models/FeeLedger.js
import mongoose from "mongoose";

const feeLedgerSchema = new mongoose.Schema(
  {
    // ============================================
    // Fee metadata
    // ============================================
    type: {
      type: String,
      enum: ["withdrawal_fee", "buy_fee", "sell_fee"],
      required: true,
      index: true,
    },

    amountSol: {
      type: Number,
      required: true,
      min: 0,
    },

    // ============================================
    // Attribution
    // ============================================
    walletAddress: {
      type: String,
      index: true,
      required: true,
    },

    withdrawalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
    },

    tradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trade",
      default: null,
    },

    // ============================================
    // Status
    // ============================================
    status: {
      type: String,
      enum: ["recorded", "withdrawn"],
      default: "recorded",
      index: true,
    },

    // ============================================
    // Audit
    // ============================================
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    strict: true,
  }
);

export default mongoose.model("FeeLedger", feeLedgerSchema);
