import express from "express";
import User from "../../models/User.js";
import SignalChannel from "../../models/SignalChannel.js";

console.log("🔥 LOADED users API ROUTER:", import.meta.url);

const router = express.Router();

/**
 * ===================================================
 * GET /api/users
 * Fetch user by wallet
 * ===================================================
 */
router.get("/", async (req, res) => {
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) return res.json({ user: null });

    const user = await User.findOne({ walletAddress }).lean();
    return res.json({ user: user || null });
  } catch (err) {
    console.error("❌ get user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/users
 * Ensure user exists (idempotent)
 * Used by frontend when wallet connects
 * ===================================================
 */
router.post("/", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress_required" });
    }

    let user = await User.findOne({ walletAddress });

    if (!user) {
      user = await User.create({
        walletAddress,
        createdAt: new Date(),
      });

      console.log("✅ Created new user:", walletAddress);
    }

    return res.json({ ok: true, user });
  } catch (err) {
    console.error("❌ ensure user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/users/subscribe
 * OPTION A — API-ONLY ENFORCEMENT
 * ===================================================
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
        message: "Link your Telegram account first",
      });
    }

    // 🔐 One Telegram → one wallet
    const telegramOwner = await User.findOne({
      "telegram.userId": user.telegram.userId,
      walletAddress: { $ne: walletAddress },
    });

    if (telegramOwner) {
      return res.status(403).json({
        error: "telegram_wallet_locked",
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

    return res.json({ ok: true, status: "pending" });
  } catch (err) {
    console.error("❌ subscribe error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
