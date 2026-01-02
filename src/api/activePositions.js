import express from "express";
import fetch from "node-fetch";
import User from "../../models/User.js";

const router = express.Router();

// --------------------------------------------------
// Bot service base URL
// --------------------------------------------------
// Railway: set BOT_API_BASE to bot service URL
// Local fallback: http://localhost:8081
const BOT_API_BASE =
  process.env.BOT_API_BASE || "http://localhost:8081";

/**
 * GET /api/active-positions/wallet/:wallet
 */
router.get("/wallet/:wallet", async (req, res) => {
  try {
    const wallet = String(req.params.wallet);

    // --------------------------------------------------
    // Validate user exists (API owns DB)
    // --------------------------------------------------
    const user = await User.findOne({ walletAddress: wallet });
    if (!user) {
      return res.json({ positions: [] });
    }

    // --------------------------------------------------
    // Ask BOT SERVICE for live positions (🔥 FIX)
    // --------------------------------------------------
    const botRes = await fetch(
      `${BOT_API_BASE.replace(/\/$/, "")}/api/active-positions/wallet/${wallet}`
    );

    const payload = await botRes.json().catch(() => null);

    if (!botRes.ok) {
      console.error("Bot active-positions failed:", payload);
      return res.status(502).json({
        error: "bot_service_failed",
        details: payload,
      });
    }

    // --------------------------------------------------
    // Success — passthrough
    // --------------------------------------------------
    return res.json(payload);

  } catch (err) {
    console.error("active-positions API error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
