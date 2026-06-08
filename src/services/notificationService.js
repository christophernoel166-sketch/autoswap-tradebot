import UserNotification
from "../../models/UserNotification.js";

export async function createNotification({
  walletAddress,
  type = "info",
  title = "",
  message = "",
}) {
  try {
    await UserNotification.create({
      walletAddress,
      type,
      title,
      message,
      read: false,
    });
  } catch (err) {
    console.error(
      "❌ Failed to create notification:",
      err?.message || err
    );
  }
}