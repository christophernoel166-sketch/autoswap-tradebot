// src/api/channels.js
import express from "express";
import User from "../../models/User.js";
import SignalChannel from "../../models/SignalChannel.js";

const router = express.Router();

/**
 * ===================================================
 * STEP 4.1
 * GET /api/channels
 * List ALL active signal channels (for dropdown UI)
 * ===================================================
 */
router.get("/", async (req, res) => {
  try {
    const channels = await SignalChannel.find(
      { status: "active" },
      { channelId: 1, title: 1, _id: 0 }
    ).lean();

    return res.json({ channels });
  } catch (err) {
    console.error("❌ Error fetching channels:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/channels/connect
 * User clicks "Enable" in dashboard
 * ===================================================
 */
router.post("/connect", async (req, res) => {
  try {
    const { wallet, channel } = req.body;

    if (!wallet || !channel) {
      return res.status(400).json({
        error: "wallet and channel are required",
      });
    }

    const user = await User.findOne({ walletAddress: wallet });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let sub = user.subscribedChannels.find(
      (c) => c.channelId === String(channel)
    );

    if (!sub) {
      user.subscribedChannels.push({
        channelId: String(channel),
        enabled: true,
        status: "pending",
        requestedAt: new Date(),
      });
    } else {
      sub.enabled = true;
    }

    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error connecting channel:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * GET /api/channels/:wallet
 * Fetch user's subscriptions
 * ===================================================
 */
router.get("/:wallet", async (req, res) => {
  try {
    const user = await User.findOne({
      walletAddress: req.params.wallet,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      channels: user.subscribedChannels || [],
    });
  } catch (err) {
    console.error("❌ Error fetching user channels:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
