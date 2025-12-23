import mongoose from "mongoose";

const channelSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: "global" }, // single document to store channel list
  channels: { type: [String], default: [] },
});

export default mongoose.model("ChannelSettings", channelSettingsSchema);
