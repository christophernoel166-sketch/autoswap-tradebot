import { createNotification } from "./notificationService.js";

// =====================================================
// BUILD NOTIFICATION
// =====================================================

function buildNotification(result, watch) {

  switch (result.event) {

    case "BREAKOUT_CONFIRMED":
      return {
        type: "success",
        title: "🚀 Breakout Confirmed",
        message: `${watch.tokenSymbol || "Token"} has confirmed its breakout. Entry conditions have been met.`,
      };

    case "PULLBACK_COMPLETED":
      return {
        type: "success",
        title: "📈 Pullback Complete",
        message: `${watch.tokenSymbol || "Token"} has completed its pullback and is ready for entry.`,
      };

    case "SETUP_INVALIDATED":
      return {
        type: "warning",
        title: "❌ Setup Invalidated",
        message: `${watch.tokenSymbol || "Token"} is no longer a valid trade setup.`,
      };

    case "BREAKOUT_FAILED":
      return {
        type: "warning",
        title: "⚠️ Breakout Failed",
        message: `${watch.tokenSymbol || "Token"} failed to confirm its breakout.`,
      };

    case "PULLBACK_FAILED":
      return {
        type: "warning",
        title: "⚠️ Pullback Failed",
        message: `${watch.tokenSymbol || "Token"} failed to complete its pullback.`,
      };

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

  const payload =
    buildNotification(result, watch);

  if (!payload) {
    return;
  }

  await createNotification({

    walletAddress:
      watch.walletAddress,

    type:
      payload.type,

    title:
      payload.title,

    message:
      payload.message,

    data: {

      watchId:
        watch._id,

      tokenMint:
        watch.tokenMint,

      tokenSymbol:
        watch.tokenSymbol,

      previousAction:
        result.previousAction,

      currentAction:
        result.currentAction,

      event:
        result.event,

    },

  });

}