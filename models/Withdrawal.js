import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  walletAddress: { type: String, index: true },
  amountSol: { type: Number, required: true },

  feeSol: { type: Number, required: true },
  netAmountSol: { type: Number, required: true },

  txSignature: { type: String },
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Withdrawal", withdrawalSchema);
