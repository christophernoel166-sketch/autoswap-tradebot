import express from "express";
import SignalChannel from "../models/SignalChannel.js";
import User from "../models/User.js";

const router = express.Router();

function cleanStr(x) {
  return String(x || "").trim();
}

// lightweight base58-ish check (Solana addresses are usually 32–44 chars)
function looksLikeSolWallet(s) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

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
    const walletAddress = cleanStr(req.params.walletAddress);

    if (!walletAddress || !looksLikeSolWallet(walletAddress)) {
      return res.status(400).json({ error: "invalid_wallet" });
    }

    const user = await User.findOne({ walletAddress }).lean();
    if (!user) {
      return res.json({ channels: [] });
    }

    const allChannels = await SignalChannel.find({ status: "active" }).lean();

    const subscriptions = (user.subscribedChannels || []).map((sub) => {
      const meta = allChannels.find((c) => c.channelId === sub.channelId);

      return {
        channelId: sub.channelId,
        name: meta?.name || meta?.username || sub.channelId,
        enabled: sub.enabled,
        status: sub.status, // helpful for dashboard
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
 * IMPORTANT: Do NOT upsert users here.
 * =====================================================
 */
router.post("/link", async (req, res) => {
  try {
    const walletAddress = cleanStr(req.body.walletAddress);
    const channelId = cleanStr(req.body.channelId);
    const enabled = req.body.enabled !== false; // default true

    if (!walletAddress || !channelId) {
      return res.status(400).json({ error: "walletAddress & channelId required" });
    }

    if (!looksLikeSolWallet(walletAddress)) {
      return res.status(400).json({ error: "invalid_wallet" });
    }

    // Channel must exist and be active
    const channel = await SignalChannel.findOne({
      channelId,
      status: "active",
    }).lean();

    if (!channel) {
      return res.status(404).json({ error: "channel_not_found" });
    }

    // ✅ Require user to exist (NO accidental user creation)
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // 1) Update existing subscription if present
    const updated = await User.findOneAndUpdate(
      { walletAddress, "subscribedChannels.channelId": channelId },
      { $set: { "subscribedChannels.$.enabled": enabled } },
      { new: true }
    );

    // 2) Otherwise push new subscription entry
    if (!updated) {
      await User.updateOne(
        { walletAddress },
        {
          $push: {
            subscribedChannels: {
              channelId,
              enabled,
              // status stays default "pending" per schema (good)
            },
          },
        }
      );
    }

    return res.json({ ok: true, walletAddress, channelId, enabled });
  } catch (err) {
    console.error("POST /channels/link error:", err);
    res.status(500).json({ error: "channel_toggle_failed" });
  }
});

export default router;