import { notifyChartWatch } from "./chartWatchNotificationService.js";
import { notifyTelegramChartWatch } from "./chartTelegramNotificationService.js";

// =====================================================
// DISPATCH CHART NOTIFICATION
// =====================================================

export async function dispatchChartNotification({
  watch,
  result,
}) {

  if (!watch || !result) {
    return;
  }

  // ============================================
  // Dashboard Notification
  // ============================================

  try {

    await notifyChartWatch(
      watch,
      result
    );

  } catch (err) {

    console.error(
      "Dashboard notification failed:",
      err.message
    );

  }

  // ============================================
  // Telegram Notification
  // ============================================

  try {

    await notifyTelegramChartWatch(
      watch,
      result
    );

  } catch (err) {

    console.error(
      "Telegram notification failed:",
      err.message
    );

  }

  // ============================================
  // Email Notification (Future)
  // ============================================

  try {

    // Future implementation

  } catch (err) {

    console.error(
      "Email notification failed:",
      err.message
    );

  }

  // ============================================
  // Discord Notification (Future)
  // ============================================

  try {

    // Future implementation

  } catch (err) {

    console.error(
      "Discord notification failed:",
      err.message
    );

  }

  // ============================================
  // Push Notification (Future)
  // ============================================

  try {

    // Future implementation

  } catch (err) {

    console.error(
      "Push notification failed:",
      err.message
    );

  }

}