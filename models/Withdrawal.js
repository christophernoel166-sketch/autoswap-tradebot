import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, index: true },

    // Total user requested (includes fee)
    amountSol: { type: Number, required: true },

    // Platform flat fee
    feeSol: { type: Number, required: true },

    // What user actually receives
    netAmountSol: { type: Number, required: true },

    txSignature: { type: String },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },

    // Optional structured error info
    error: { type: String },

    sentAt: { type: Date },
    failedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export default mongoose.model("Withdrawal", withdrawalSchema);