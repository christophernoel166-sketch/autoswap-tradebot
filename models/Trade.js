import mongoose from "mongoose";

// Prevent model overwrite on dev reload
const TradeSchema = new mongoose.Schema({
  tgId: { type: String, index: true },         // Telegram user ID
  tradeId: { type: Number },                   // optional internal ID
  tradeType: { type: String, enum: ["auto", "manual"], default: "manual" },
  tokenMint: { type: String, required: true }, // token mint address

  params: { type: Object, default: {} },       // trade parameters
  state: { type: Object, default: {} },        // runtime state for auto-trader

  entryPrice: { type: Number, default: 0 },    // price at buy
  exitPrice: { type: Number, default: 0 },     // price at sell (approx)
  takeProfit: { type: Number, default: 0 },
  stopLoss: { type: Number, default: 0 },

  amountSol: { type: Number, default: 0 },     // SOL size
  amountToken: { type: Number, default: 0 },   // token size (optional)

  // ✅ realized PnL (in SOL), approximate
  pnlSol: { type: Number, default: 0 },

  status: { type: String, default: "open" },   // open, closed, canceled
  buyTxid: { type: String },
  sellTxid: { type: String },

  source: { type: String, default: "telegram" }, // telegram / manual / other

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update timestamp
TradeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Trade ||
  mongoose.model("Trade", TradeSchema);
