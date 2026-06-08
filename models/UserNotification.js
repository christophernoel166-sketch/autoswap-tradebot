import mongoose from "mongoose";

const UserNotificationSchema =
  new mongoose.Schema(
    {
      walletAddress: {
        type: String,
        required: true,
        index: true,
      },

      type: {
        type: String,
        enum: ["success", "error", "info"],
        default: "info",
      },

      title: {
        type: String,
        default: "",
      },

      message: {
        type: String,
        default: "",
      },

      read: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "UserNotification",
  UserNotificationSchema
);