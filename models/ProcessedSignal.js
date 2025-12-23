import mongoose from "mongoose";

const processedSignalSchema = new mongoose.Schema({
  channelId: { type: String, index: true },
  mint: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
});

// One signal per channel + mint
processedSignalSchema.index(
  { channelId: 1, mint: 1 },
  { unique: true }
);

export default mongoose.model("ProcessedSignal", processedSignalSchema);
