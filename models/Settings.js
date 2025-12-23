import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  stopLoss: { type: String, default: "" },
  trailingStop: { type: String, default: "" },
  distanceStopLoss: { type: String, default: "" },
  tp1: { type: String, default: "" },
  tp2: { type: String, default: "" },
  tp3: { type: String, default: "" },
  tradeAmount: { type: String, default: "" },
}, { timestamps: true });

// ✅ Add mapping between _id ↔ walletAddress in memory
settingsSchema.post("init", function (doc) {
  if (!global.walletIdMap) global.walletIdMap = new Map();
  global.walletIdMap.set(doc._id.toString(), doc.walletAddress);
});

settingsSchema.post("save", function (doc) {
  if (!global.walletIdMap) global.walletIdMap = new Map();
  global.walletIdMap.set(doc._id.toString(), doc.walletAddress);
});

settingsSchema.post("remove", function (doc) {
  if (global.walletIdMap) global.walletIdMap.delete(doc._id.toString());
});

const TradeSetting = mongoose.model("TradeSetting", settingsSchema);

export default TradeSetting;
