import mongoose from "mongoose";

// Prevent model overwrite on dev reload
const TradeSchema = new mongoose.Schema({
  tgId: { type: String, index: true }, // Telegram user ID (wallet in wallet-mode)
  walletAddress: { type: String, index: true }, // wallet-mode identity

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
// ✅ Actual SOL received from confirmed SELL execution
solReceived: { type: Number, default: 0 },

// ✅ Realized PnL percentage based on actual execution prices
pnlPercent: { type: Number, default: null },

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
