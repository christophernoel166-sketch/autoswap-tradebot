import express from "express";
import crypto from "crypto";
import User from "../../models/User.js";
import { generateTradingWallet } from "../services/walletService.js";

console.log("🔥 LOADED users API ROUTER:", import.meta.url);

const router = express.Router();

/**
 * ===================================================
 * 🔐 SANITIZE USER (NEVER EXPOSE PRIVATE DATA)
 * ===================================================
 */
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
    const { walletAddress } = req.query;
    if (!walletAddress) return res.json({ user: null });

    const user = await User.findOne({ walletAddress });

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("❌ get user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * POST /api/users
 * Ensure user exists (idempotent)
 * Now auto-creates per-user trading wallet
 * ===================================================
 */
router.post("/", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress_required" });
    }

    let user = await User.findOne({ walletAddress });

    // ---------------------------------------------------
    // 🆕 CREATE USER + TRADING WALLET
    // ---------------------------------------------------
    if (!user) {
      const {
        publicKey,
        encryptedPrivateKey,
        iv,
      } = generateTradingWallet();

      user = await User.create({
        walletAddress,

        // 🔐 Per-user trading wallet
        tradingWalletPublicKey: publicKey,
        tradingWalletEncryptedPrivateKey: encryptedPrivateKey,
        tradingWalletIv: iv,

        createdAt: new Date(),
        subscribedChannels: [],
        tradingEnabled: false,

        // Trading defaults
        solPerTrade: 0.01,
        stopLoss: 10,
        trailingTrigger: 5,
        trailingDistance: 3,
        tp1: 10,
        tp1SellPercent: 25,
        tp2: 20,
        tp2SellPercent: 35,
        tp3: 30,
        tp3SellPercent: 40,

        // Execution defaults
        maxSlippagePercent: 2,
        mevProtection: true,
      });

      console.log("✅ Created new user with trading wallet:", walletAddress);
      console.log("🔐 Trading wallet:", publicKey);
    }

    return res.json({
      ok: true,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("❌ ensure user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ===================================================
 * 🔒 POST /api/users/toggle-trading
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
 * ===================================================
 */
router.post("/update-settings", async (req, res) => {
  try {
    const {
      walletAddress,
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
      });
    }

    const code = crypto.randomBytes(4).toString("hex");

    user.telegram = {
      ...user.telegram,
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
