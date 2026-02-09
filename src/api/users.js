import express from "express";
import crypto from "crypto";
import User from "../../models/User.js";

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
        subscribedChannels: [],
        balanceSol: 0,
        lockedBalanceSol: 0,
        tradingEnabled: false, // 🔒 SAFE DEFAULT

        // ✅ Execution defaults (F5)
        maxSlippagePercent: 2,
        mevProtection: true,
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
 * 🔒 POST /api/users/toggle-trading
 * Enable / disable automated trading
 * ===================================================
 */
router.post("/toggle-trading", async (req, res) => {
  try {
    const { walletAddress, enabled } = req.body;

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

    return res.json({
      ok: true,
      tradingEnabled: user.tradingEnabled,
    });
  } catch (err) {
    console.error("❌ toggle-trading error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * 🧠 POST /api/users/update-settings
 * Trading + Execution settings (F5)
 * ===================================================
 */
router.post("/update-settings", async (req, res) => {
  try {
    const {
      walletAddress,

      // Trading params
      solPerTrade,
      stopLoss,
      trailingTrigger,
      trailingDistance,
      tp1,
      tp1SellPercent,
      tp2,
      tp2SellPercent,
      tp3,
      tp3SellPercent,

      // 🔐 Execution params
      maxSlippagePercent,
      mevProtection,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress_required" });
    }

    const update = {
      solPerTrade,
      stopLoss,
      trailingTrigger,
      trailingDistance,
      tp1,
      tp1SellPercent,
      tp2,
      tp2SellPercent,
      tp3,
      tp3SellPercent,
    };

    // ---------------------------------------------------
    // 🔐 Execution settings (SAFE + OPTIONAL)
    // ---------------------------------------------------
    if (typeof maxSlippagePercent === "number") {
      update.maxSlippagePercent = maxSlippagePercent;
    }

    if (typeof mevProtection === "boolean") {
      update.mevProtection = mevProtection;
    }

    const result = await User.updateOne(
      { walletAddress },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ update-settings error:", err);
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

// ===================================================
// 🛑 ANTI-SPAM COOLDOWN
// ===================================================
const RESUBMIT_COOLDOWN_MS = parseInt(
  process.env.RESUBMIT_COOLDOWN_MS || String(5 * 60 * 1000),
  10
);

function isInCooldown(sub) {
  if (!sub?.requestedAt) return false;
  return Date.now() - new Date(sub.requestedAt).getTime() < RESUBMIT_COOLDOWN_MS;
}

/**
 * ===================================================
 * POST /api/users/subscribe
 * Wallet → Channel subscription request
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

    const channelId = String(channel).replace(/^@/, "");
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (!Array.isArray(user.subscribedChannels)) {
      user.subscribedChannels = [];
    }

    if (!user.telegram?.userId) {
      return res.status(403).json({
        error: "telegram_not_linked",
        message: "Link your Telegram account first",
      });
    }

    const telegramOwner = await User.findOne({
      "telegram.userId": user.telegram.userId,
      walletAddress: { $ne: walletAddress },
    });

    if (telegramOwner) {
      return res.status(403).json({ error: "telegram_wallet_locked" });
    }

    let sub = user.subscribedChannels.find(
      (c) => String(c.channelId).replace(/^@/, "") === channelId
    );

    if (!sub) {
      user.subscribedChannels.push({
        channelId,
        enabled: false,
        status: "pending",
        requestedAt: new Date(),
      });
    } else if (sub.status === "rejected" || sub.status === "expired") {
      sub.status = "pending";
      sub.enabled = false;
      sub.requestedAt = new Date();
    } else if (sub.status === "pending") {
      if (isInCooldown(sub)) {
        return res.status(429).json({ error: "cooldown_active" });
      }
      sub.requestedAt = new Date();
    } else if (sub.status === "approved") {
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
