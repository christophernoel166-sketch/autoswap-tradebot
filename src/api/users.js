// src/api/users.js
import express from "express";
import crypto from "crypto";
import User from "../../models/User.js";
import { generateTradingWallet } from "../services/walletService.js";

console.log("🔥 LOADED users API ROUTER:", import.meta.url);

const router = express.Router();

function cleanStr(x) {
  return String(x || "").trim();
}

function looksLikeSolWallet(s) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s || "").trim());
}

function looksLikeChannelId(s) {
  // Telegram numeric IDs: "-100..." for channels
  return /^-?\d+$/.test(String(s || "").trim());
}

function sanitizeUser(user) {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : user;
  delete u.tradingWalletEncryptedPrivateKey;
  delete u.tradingWalletIv;
  return u;
}

/**
 * ===================================================
 * GET /api/users
 * Fetch user by wallet
 * ===================================================
 */
router.get("/", async (req, res) => {
  try {
    const walletAddress = cleanStr(req.query.walletAddress);
    if (!walletAddress || !looksLikeSolWallet(walletAddress)) {
      return res.json({ user: null });
    }

    const user = await User.findOne({ walletAddress });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("❌ get user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/users
 * Create user (STRICT)
 * ===================================================
 */
router.post("/", async (req, res) => {
  try {
    const walletAddress = cleanStr(req.body.walletAddress);

    if (!walletAddress || !looksLikeSolWallet(walletAddress)) {
      return res.status(400).json({ error: "invalid_wallet" });
    }

    let user = await User.findOne({ walletAddress });

    if (!user) {
      const { publicKey, encryptedPrivateKey, iv } = generateTradingWallet();

      user = await User.create({
        walletAddress,
        tradingWalletPublicKey: publicKey,
        tradingWalletEncryptedPrivateKey: encryptedPrivateKey,
        tradingWalletIv: iv,
        tradingEnabled: false,
        subscribedChannels: [],
      });
    }

    return res.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error("❌ ensure user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * ✅ POST /api/users/subscribe
 * STRICT: accepts ONLY numeric channelId
 * ===================================================
 */
router.post("/subscribe", async (req, res) => {
  try {
    const walletAddress = cleanStr(req.body.walletAddress);
    const channelId = cleanStr(req.body.channelId);
    const enabled =
      typeof req.body.enabled === "boolean" ? req.body.enabled : true;

    if (!walletAddress || !looksLikeSolWallet(walletAddress)) {
      return res.status(400).json({ error: "invalid_wallet" });
    }

    if (!channelId || !looksLikeChannelId(channelId)) {
      return res.status(400).json({ error: "invalid_channelId" });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const finalChannelId = String(channelId);

    const existing = (user.subscribedChannels || []).find(
      (c) => String(c.channelId) === finalChannelId
    );

    if (existing) {
      existing.enabled = enabled;

      if (!existing.status) existing.status = "pending";
      if (!existing.requestedAt) existing.requestedAt = new Date();

      // If rejected/expired and re-requesting, flip back to pending
      if (existing.status === "rejected" || existing.status === "expired") {
        existing.status = "pending";
        existing.requestedAt = new Date();
        existing.approvedAt = null;
        existing.expiredAt = null;
      }
    } else {
      user.subscribedChannels = user.subscribedChannels || [];
      user.subscribedChannels.push({
        channelId: finalChannelId,
        enabled,
        status: "pending",
        requestedAt: new Date(),
      });
    }

    await user.save();

    const saved = (user.subscribedChannels || []).find(
      (c) => String(c.channelId) === finalChannelId
    );

    return res.json({
      ok: true,
      walletAddress,
      channelId: finalChannelId,
      enabled: Boolean(saved?.enabled),
      status: saved?.status || "pending",
    });
  } catch (err) {
    console.error("❌ users/subscribe error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/users/toggle-trading
 * ===================================================
 */
router.post("/toggle-trading", async (req, res) => {
  try {
    const walletAddress = cleanStr(req.body.walletAddress);
    const enabled = req.body.enabled;

    if (!walletAddress || typeof enabled !== "boolean") {
      return res.status(400).json({ error: "invalid_request" });
    }

    const user = await User.findOneAndUpdate(
      { walletAddress },
      { $set: { tradingEnabled: enabled } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json({ ok: true, tradingEnabled: user.tradingEnabled });
  } catch (err) {
    console.error("❌ toggle-trading error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/users/link-code
 * (kept because your dashboard uses it)
 * ===================================================
 */
router.post("/link-code", async (req, res) => {
  try {
    const walletAddress = cleanStr(req.body.walletAddress);

    if (!walletAddress || !looksLikeSolWallet(walletAddress)) {
      return res.status(400).json({ error: "invalid_wallet" });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (user.telegram?.userId) {
      return res.status(400).json({ error: "already_linked" });
    }

    const code = crypto.randomBytes(4).toString("hex");

    user.telegram = {
      ...(user.telegram || {}),
      linkCode: code,
      linkedAt: null,
    };

    await user.save();

    return res.json({
      ok: true,
      code,
      command: `/link_wallet ${code}`,
    });
  } catch (err) {
    console.error("❌ link-code error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;