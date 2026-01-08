import express from "express";
import fetch from "node-fetch";
import User from "../../models/User.js";

const router = express.Router();

// --------------------------------------------------
// Bot service base URL (REQUIRED in production)
// --------------------------------------------------
const BOT_API_BASE = process.env.BOT_API_BASE;

if (!BOT_API_BASE) {
  throw new Error("BOT_API_BASE environment variable is not set");
}

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
    // Ask BOT SERVICE for live positions
    // --------------------------------------------------
    const botUrl = `${BOT_API_BASE.replace(/\/$/, "")}/api/active-positions/wallet/${wallet}`;

    const botRes = await fetch(botUrl);
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
