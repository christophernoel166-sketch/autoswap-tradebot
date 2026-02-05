import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    txSignature: {
      type: String,
      required: true,
      unique: true, // 🔒 prevents double processing
      index: true,
    },

    fromWallet: {
      type: String,
      required: true,
      index: true,
    },

    creditedWallet: {
      type: String,
      required: true,
      index: true,
    },

    amountSol: {
      type: Number,
      required: true,
      min: 0,
    },

    slot: {
      type: Number,
    },

    blockTime: {
      type: Date,
    },

    memo: {
      type: String,
    },

    status: {
      type: String,
      enum: ["detected", "credited"],
      default: "detected", // 🔒 balance not updated yet
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Deposit", depositSchema);
