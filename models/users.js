import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  telegramId: { type: String, default: null },  // NOT REQUIRED
  walletAddress: { type: String, default: null },

  solPerTrade: { type: Number, default: 0.01 },

  tp1: { type: Number, default: 10 },
  tp2: { type: Number, default: 20 },
  tp3: { type: Number, default: 30 },

  tp1SellPercent: { type: Number, default: 25 },
  tp2SellPercent: { type: Number, default: 35 },
  tp3SellPercent: { type: Number, default: 40 },

  stopLoss: { type: Number, default: 10 },
  trailingTrigger: { type: Number, default: 5 },
  trailingDistance: { type: Number, default: 3 },

  createdAt: { type: Date, default: Date.now },
});

// IMPORTANT: disable unique index if previously applied
userSchema.index({ telegramId: 1 }, { unique: false });

export default mongoose.model("User", userSchema);
