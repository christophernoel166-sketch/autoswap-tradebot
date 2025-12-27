import express from "express";
import User from "../../models/User.js";
import SignalChannel from "../../models/SignalChannel.js";

console.log("🔥 LOADED users API ROUTER:", import.meta.url);

const router = express.Router();

/**
 * =====================================================
 * GET /api/users
 * Fetch OR create user by wallet
 * =====================================================
 */
router.get("/", async (req, res) => {
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) {
      return res.json({ user: null });
    }

    // ✅ AUTO-CREATE USER ON FIRST WALLET CONNECT
    const user = await User.findOneAndUpdate(
      { walletAddress },
      {
        $setOnInsert: {
          walletAddress,
          createdAt: new Date(),
          subscribedChannels: [],
          telegram: null,
        },
      },
      {
        new: true,      // return updated / created doc
        upsert: true,   // create if not exists
      }
    ).lean();

    return res.json({ user });
  } catch (err) {
    console.error("❌ get user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * =====================================================
 * POST /api/users/subscribe
 * OPTION A — API-ONLY ENFORCEMENT
 * =====================================================
 */
router.post("/subscribe", async (req, res) => {
  try {
    const { walletAddress, channel } = req.body;
    const channelId = String(channel);

    if (!walletAddress || !channelId) {
      return res.status(400).json({
        error: "walletAddress & channel required",
      });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // 🔐 Telegram must be linked
    if (!user.telegram?.userId) {
      return res.status(403).json({
        error: "telegram_not_linked",
        message: "Link your Telegram account before requesting channel access",
      });
    }

    // 🔐 One Telegram → One Wallet
    const telegramOwner = await User.findOne({
      "telegram.userId": user.telegram.userId,
      walletAddress: { $ne: walletAddress },
    });

    if (telegramOwner) {
      return res.status(403).json({
        error: "telegram_wallet_locked",
        message: "This Telegram account is already linked to another wallet",
      });
    }

    let sub = user.subscribedChannels.find(
      (c) => c.channelId === channelId
    );

    if (!sub) {
      user.subscribedChannels.push({
        channelId,
        enabled: false,
        status: "pending",
        requestedAt: new Date(),
      });
    } else if (sub.status === "rejected") {
      sub.status = "pending";
      sub.enabled = false;
      sub.requestedAt = new Date();
    } else {
      return res.json({ ok: true, status: sub.status });
    }

    await user.save();

    const signalChannel = await SignalChannel.findOne({ channelId }).lean();
    if (!signalChannel) {
      return res.json({ ok: true, status: "pending" });
    }

    return res.json({ ok: true, status: "pending" });
  } catch (err) {
    console.error("❌ subscribe error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
