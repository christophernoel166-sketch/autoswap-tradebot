import UserNotification from "../../models/UserNotification.js";
import { getIO } from "./socketService.js";

// =====================================================
// CREATE NOTIFICATION
// =====================================================

export async function createNotification({
  walletAddress,
  type = "info",
  title = "",
  message = "",
  data = null,
}) {
  try {
    // ============================================
    // Save notification to MongoDB
    // ============================================

    const notification =
      await UserNotification.create({
        walletAddress,
        type,
        title,
        message,
        data,
        read: false,
      });

    // ============================================
    // Emit real-time notification
    // ============================================

    const io = getIO();

    if (io) {
      io.to(`wallet:${walletAddress}`).emit(
        "notification",
        {
          _id: notification._id,
          walletAddress,
          type,
          title,
          message,
          data,
          read: false,
          createdAt: notification.createdAt,
        }
      );
    }

    return notification;
  } catch (err) {
    console.error(
      "❌ Failed to create notification:",
      err?.message || err
    );

    return null;
  }
}