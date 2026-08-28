import { createNotification } from "./notificationService.js";

// =====================================================
// BUILD NOTIFICATION
// =====================================================

function buildNotification(result, watch) {

  switch (result.event) {

    // ===================================================
    // BREAKOUT CONFIRMED
    // ===================================================

    case "BREAKOUT_CONFIRMED":
      return {
        type: "success",
        title: "🚀 Breakout Confirmed",
        message: `${
          watch.symbol || "Token"
        } has confirmed its breakout. Entry conditions have been met.`,
      };


    // ===================================================
    // PULLBACK COMPLETED
    // ===================================================

    case "PULLBACK_COMPLETED":
      return {
        type: "success",
        title: "📈 Pullback Complete",
        message: `${
          watch.symbol || "Token"
        } has completed its pullback and is ready for entry.`,
      };


    // ===================================================
    // SETUP INVALIDATED
    // ===================================================

    case "SETUP_INVALIDATED":
      return {
        type: "warning",
        title: "❌ Setup Invalidated",
        message: `${
          watch.symbol || "Token"
        } is no longer a valid trade setup.`,
      };


    // ===================================================
    // BREAKOUT FAILED
    // ===================================================

    case "BREAKOUT_FAILED":
      return {
        type: "warning",
        title: "⚠️ Breakout Failed",
        message: `${
          watch.symbol || "Token"
        } failed to confirm its breakout.`,
      };


    // ===================================================
    // PULLBACK FAILED
    // ===================================================

    case "PULLBACK_FAILED":
      return {
        type: "warning",
        title: "⚠️ Pullback Failed",
        message: `${
          watch.symbol || "Token"
        } failed to complete its pullback.`,
      };


    // ===================================================
    // UNKNOWN / NO EVENT
    // ===================================================

    default:
      return null;

  }

}


// =====================================================
// SEND NOTIFICATION
// =====================================================

export async function notifyChartWatch(
  watch,
  result
) {

  if (!watch || !result) {
    return;
  }

  const payload =
    buildNotification(
      result,
      watch
    );

  if (!payload) {
    return;
  }

  await createNotification({

    // ===================================================
    // USER
    // ===================================================

    walletAddress:
      watch.walletAddress,


    // ===================================================
    // NOTIFICATION
    // ===================================================

    type:
      payload.type,

    title:
      payload.title,

    message:
      payload.message,


    // ===================================================
    // CHART WATCH DATA
    // ===================================================

    data: {

      watchId:
        watch._id,

      // Notification payload field
      // intentionally remains tokenMint
      tokenMint:
        watch.mintAddress,

      // Notification payload field
      // intentionally remains tokenSymbol
      tokenSymbol:
        watch.symbol,

      previousAction:
        result.previousAction,

      currentAction:
        result.currentAction,

      event:
        result.event,

    },

  });

}