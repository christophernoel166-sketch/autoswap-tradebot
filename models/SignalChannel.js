import mongoose from "mongoose";

const SignalChannelSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  username: { type: String },
  title: { type: String },

  status: {
    type: String,
    enum: ["active", "inactive", "disabled"],
    default: "active",
  },

// 👇 ADD THIS NOW (Step 0)
  approvalMode: {
    type: String,
    enum: ["open", "manual"],
    default: "open",
  },

  ownerWallet: { type: String, index: true },
  claimedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("SignalChannel", SignalChannelSchema);
