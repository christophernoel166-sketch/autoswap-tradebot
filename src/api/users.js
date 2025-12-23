import express from "express";
import User from "../../models/User.js";
import SignalChannel from "../../models/SignalChannel.js";
import bot from "../telegram/bot.js";

console.log("🔥 LOADED users API ROUTER:", import.meta.url);

const router = express.Router();

/**
 * GET /api/users
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
 * POST /api/users/subscribe
 * OPTION A — ENFORCED
 * - Telegram must be linked
 * - 1 Telegram → 1 Wallet (locked)
 * - Request posted INTO CHANNEL
 */
router.post("/subscribe", async (req, res) => {
  try {
    console.log("\n📥 SUBSCRIBE REQUEST:", req.body);

    const { walletAddress, channel } = req.body;
    const channelId = String(channel);

    if (!walletAddress || !channelId) {
      return res.status(400).json({
        error: "walletAddress & channel required",
      });
    }

    // --------------------------------------------------
    // LOAD USER
    // --------------------------------------------------
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // --------------------------------------------------
    // 🔐 ENFORCEMENT #1: Telegram MUST be linked
    // --------------------------------------------------
    if (!user.telegram?.userId) {
      return res.status(403).json({
        error: "telegram_not_linked",
        message: "Link your Telegram account before requesting channel access",
      });
    }

    // --------------------------------------------------
    // 🔐 ENFORCEMENT #2: Telegram → ONE wallet ONLY
    // --------------------------------------------------
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

    // --------------------------------------------------
    // UPDATE SUBSCRIPTION STATE
    // --------------------------------------------------
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

    // --------------------------------------------------
    // LOAD SIGNAL CHANNEL
    // --------------------------------------------------
    const signalChannel = await SignalChannel.findOne({
      channelId,
    }).lean();

    if (!signalChannel) {
      console.warn("⚠️ No SignalChannel record for:", channelId);
      return res.json({ ok: true, status: "pending" });
    }

    // --------------------------------------------------
    // POST REQUEST INTO CHANNEL
    // --------------------------------------------------
    const username = user.telegram.username
      ? `@${user.telegram.username}`
      : "(no username)";

    const message = `🆕 *Trade Access Request*

👤 Telegram: ${username}
🆔 Telegram ID: \`${user.telegram.userId}\`
💼 Wallet: \`${user.walletAddress}\`

Approve:
/approve_wallet ${user.walletAddress}

Reject:
/reject_wallet ${user.walletAddress}
`;

    await bot.telegram.sendMessage(
      signalChannel.channelId,
      message,
      { parse_mode: "Markdown" }
    );

    console.log("✅ Trade request posted to channel:", channelId);

    return res.json({ ok: true, status: "pending" });
  } catch (err) {
    console.error("❌ subscribe fatal error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
