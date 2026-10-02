import { createNotification } from "./notificationService.js";
import User from "../../models/User.js";

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

  // ===================================================
  // SYSTEM WATCH
  // Send notification to approved/enabled subscribers
  // of the automatic chart signal channel.
  // ===================================================

  if (watch.watchType === "SYSTEM") {

    const SYSTEM_CHANNEL_ID = "-1002749359178";

    const users = await User.find({
      subscribedChannels: {
        $elemMatch: {
          channelId: SYSTEM_CHANNEL_ID,
          enabled: true,
          status: "approved",
        },
      },
    }).select("walletAddress").lean();

    if (!users.length) {
      console.log(
        "📢 SYSTEM CHART NOTIFICATION — no eligible subscribers",
        {
          channelId: SYSTEM_CHANNEL_ID,
          watchId: watch._id,
          symbol: watch.symbol,
          event: result.event,
        }
      );

      return;
    }

    console.log(
      "📢 SYSTEM CHART NOTIFICATION — sending to subscribers",
      {
        channelId: SYSTEM_CHANNEL_ID,
        subscriberCount: users.length,
        watchId: watch._id,
        symbol: watch.symbol,
        event: result.event,
      }
    );

    for (const user of users) {

      if (!user.walletAddress) {
        continue;
      }

      await createNotification({

        walletAddress:
          user.walletAddress,

        type:
          payload.type,

        title:
          payload.title,

        message:
          payload.message,

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

          channelId:
            SYSTEM_CHANNEL_ID,

        },

      });

    }

    return;
  }

  // ===================================================
  // USER WATCH
  // Preserve existing wallet-specific behavior.
  // ===================================================

  if (!watch.walletAddress) {
    console.warn(
      "⚠️ USER CHART NOTIFICATION — missing walletAddress",
      {
        watchId: watch._id,
        symbol: watch.symbol,
        event: result.event,
      }
    );

    return;
  }

  await createNotification({

    // =================================================
    // USER
    // =================================================

    walletAddress:
      watch.walletAddress,

    // =================================================
    // NOTIFICATION
    // =================================================

    type:
      payload.type,

    title:
      payload.title,

    message:
      payload.message,

    // =================================================
    // CHART WATCH DATA
    // =================================================

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