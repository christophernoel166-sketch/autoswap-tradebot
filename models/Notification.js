import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  tgId: { type: String, required: true },          // user telegram ID
  title: { type: String, required: true },         // short message
  message: { type: String, required: true },       // long message
  type: { type: String, default: "trade" },        // trade / system
  read: { type: Boolean, default: false },         // unread/read
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
