import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema({
  walletAddress: { type: String, index: true },

  type: {
    type: String,
    enum: ["deposit", "withdraw", "trade_buy", "trade_sell", "fee"],
    required: true,
  },

  amountSol: { type: Number, required: true },

  balanceBefore: Number,
  balanceAfter: Number,

  txid: String,
  meta: Object,

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Ledger", ledgerSchema);
