import express from "express";
import crypto from "crypto";
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
 * POST /api/users/link-code
 * Generate Telegram ↔ Wallet link code
 * ===================================================
 */
router.post("/link-code", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress_required" });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (user.telegram?.userId) {
      return res.status(400).json({
        error: "already_linked",
        message: "Telegram already linked to this wallet",
      });
    }

    if (user.telegram?.linkCode) {
      return res.json({
        ok: true,
        code: user.telegram.linkCode,
        instructions: "Send this command to the bot",
      });
    }

    const code = crypto.randomBytes(4).toString("hex");

    user.telegram = {
      ...user.telegram,
      linkCode: code,
      linkedAt: null,
    };

    await user.save();

    console.log("🔗 Generated link code:", code, "for", walletAddress);

    return res.json({
      ok: true,
      code,
      command: `/link_wallet ${code}`,
      instructions: "Send this command to the Telegram bot",
    });
  } catch (err) {
    console.error("❌ link-code error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/users/subscribe
 * Wallet → Channel subscription request (DB only)
 * ===================================================
 */
router.post("/subscribe", async (req, res) => {
  try {
    const { walletAddress, channel } = req.body;

    if (!walletAddress || !channel) {
      return res.status(400).json({
        error: "walletAddress & channel required",
      });
    }

    // 🔧 CRITICAL FIX: CANONICALIZE CHANNEL ID
    // Always store WITHOUT "@"
    const channelId = String(channel).replace(/^@/, "");

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (!user.telegram?.userId) {
      return res.status(403).json({
        error: "telegram_not_linked",
        message: "Link your Telegram account first",
      });
    }

    // 🔒 One Telegram account → One wallet
    const telegramOwner = await User.findOne({
      "telegram.userId": user.telegram.userId,
      walletAddress: { $ne: walletAddress },
    });

    if (telegramOwner) {
      return res.status(403).json({
        error: "telegram_wallet_locked",
      });
    }

    // 🔍 Find existing subscription (normalize both sides)
    let sub = user.subscribedChannels.find(
      (c) => String(c.channelId).replace(/^@/, "") === channelId
    );

    // ---------------------------
    // 🆕 FIRST-TIME SUBSCRIBE
    // ---------------------------
    if (!sub) {
      user.subscribedChannels.push({
        channelId, // ✅ always canonical form now
        enabled: false,
        status: "pending",
        requestedAt: new Date(),
        notifiedAt: null,
      });
    }

    // ---------------------------
    // 🔁 RE-SUBMIT AFTER REJECT
    // ---------------------------
    else if (sub.status === "rejected") {
      sub.status = "pending";
      sub.enabled = false;
      sub.requestedAt = new Date();
      sub.notifiedAt = null; // 🔥 force watcher resend
    }

    // ---------------------------
    // 🔁 RE-SUBMIT WHILE PENDING
    // ---------------------------
    else if (sub.status === "pending") {
      sub.requestedAt = new Date();
      sub.notifiedAt = null; // 🔥 force watcher resend
    }

    // ---------------------------
    // ✅ ALREADY APPROVED
    // ---------------------------
    else if (sub.status === "approved") {
      return res.json({ ok: true, status: "approved" });
    }

    await user.save();

    return res.json({ ok: true, status: "pending" });
  } catch (err) {
    console.error("❌ subscribe error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
