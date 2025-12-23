import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Channel", channelSchema);
