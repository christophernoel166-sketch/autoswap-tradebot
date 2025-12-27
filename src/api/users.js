import express from "express";
import User from "../../models/User.js";
import SignalChannel from "../../models/SignalChannel.js";

console.log("🔥 LOADED users API ROUTER:", import.meta.url);

const router = express.Router();

/**
 * ==========================================
 * POST /api/users/register
 * Create user on wallet connect (IDEMPOTENT)
 * ==========================================
 */
router.post("/register", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }

    let user = await User.findOne({ walletAddress });

    if (!user) {
      user = await User.create({
        walletAddress,
        subscribedChannels: [],
        telegram: {},
        createdAt: new Date(),
      });

      console.log("✅ New user registered:", walletAddress);
    }

    return res.json({ ok: true, user });
  } catch (err) {
    console.error("❌ register user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * ==========================================
 * GET /api/users
 * Fetch user by wallet
 * ==========================================
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

export default router;
