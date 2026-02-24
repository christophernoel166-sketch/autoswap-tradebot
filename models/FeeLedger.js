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
      required: true,
      index: true,
    },

    withdrawalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },

    tradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trade",
      default: null,
      index: true,
    },

    // ============================================
    // On-chain audit
    // ============================================
    txSignature: {
      type: String,
      default: null,
      index: true,
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
  },
  {
    timestamps: true, // adds createdAt + updatedAt
    strict: true,
  }
);

// ===================================================
// 🔒 Prevent duplicate withdrawal fees
// ===================================================
feeLedgerSchema.index(
  { type: 1, withdrawalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      withdrawalId: { $type: "objectId" },
    },
  }
);

// ===================================================
// 🔒 Prevent duplicate trade fees (buy/sell)
// ===================================================
feeLedgerSchema.index(
  { type: 1, tradeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tradeId: { $type: "objectId" },
    },
  }
);

export default mongoose.model("FeeLedger", feeLedgerSchema);