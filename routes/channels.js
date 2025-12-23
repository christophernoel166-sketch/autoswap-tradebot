import express from "express";
import SignalChannel from "../models/SignalChannel.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * =====================================================
 * GET /api/channels/available
 * Channels auto-discovered via Telegram bot
 * =====================================================
 */
router.get("/available", async (req, res) => {
  try {
    const channels = await SignalChannel.find({ status: "active" })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ channels });
  } catch (err) {
    console.error("GET /channels/available error:", err);
    res.status(500).json({ error: "failed_to_load_channels" });
  }
});

/**
 * =====================================================
 * GET /api/channels/subscriptions/:walletAddress
 * 👉 RETURNS USER SUBSCRIPTIONS WITH CHANNEL NAMES
 * =====================================================
 */
router.get("/subscriptions/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const user = await User.findOne({ walletAddress }).lean();
    if (!user) {
      return res.json({ channels: [] });
    }

    const allChannels = await SignalChannel.find({ status: "active" }).lean();

    const subscriptions = (user.subscribedChannels || []).map((sub) => {
      const meta = allChannels.find(
        (c) => c.channelId === sub.channelId
      );

      return {
        channelId: sub.channelId,
        name: meta?.name || meta?.username || sub.channelId,
        enabled: sub.enabled,
      };
    });

    res.json({ channels: subscriptions });
  } catch (err) {
    console.error("GET /channels/subscriptions error:", err);
    res.status(500).json({ error: "failed_to_load_subscriptions" });
  }
});

/**
 * =====================================================
 * POST /api/channels/link
 * Enable / Disable channel per wallet
 * =====================================================
 */
router.post("/link", async (req, res) => {
  try {
    const { walletAddress, channelId, enabled = true } = req.body;

    if (!walletAddress || !channelId) {
      return res
        .status(400)
        .json({ error: "walletAddress & channelId required" });
    }

    // Channel must exist and be active
    const channel = await SignalChannel.findOne({
      channelId,
      status: "active",
    });

    if (!channel) {
      return res.status(404).json({ error: "channel_not_found" });
    }

    /**
     * 1️⃣ Try to update existing subscription
     */
    const updated = await User.findOneAndUpdate(
      {
        walletAddress,
        "subscribedChannels.channelId": channelId,
      },
      {
        $set: { "subscribedChannels.$.enabled": enabled },
      },
      { new: true }
    );

    /**
     * 2️⃣ If no existing entry → add new subscription
     */
    if (!updated) {
      await User.findOneAndUpdate(
        { walletAddress },
        {
          $push: {
            subscribedChannels: { channelId, enabled },
          },
        },
        { upsert: true }
      );
    }

    res.json({
      ok: true,
      walletAddress,
      channelId,
      enabled,
    });
  } catch (err) {
    console.error("POST /channels/link error:", err);
    res.status(500).json({ error: "channel_toggle_failed" });
  }
});

export default router;
