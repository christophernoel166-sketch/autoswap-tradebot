import express from "express";
import fetch from "node-fetch";
import User from "../../models/User.js";

// --------------------------------------------------
// Configuration
// --------------------------------------------------
const router = express.Router();

// Bot service base URL
// 🔑 On Railway: set BOT_API_BASE to bot service URL
// 🔑 Local dev fallback: http://localhost:8081
const BOT_API_BASE =
  process.env.BOT_API_BASE || "http://localhost:8081";

// --------------------------------------------------
// POST /api/manual-sell
// --------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { walletAddress, mint } = req.body;

    if (!walletAddress || !mint) {
      return res
        .status(400)
        .json({ error: "walletAddress & mint required" });
    }

    // --------------------------------------------------
    // Validate user exists (API owns DB)
    // --------------------------------------------------
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // --------------------------------------------------
    // Forward request to BOT SERVICE (🔥 FIX)
    // --------------------------------------------------
    const botResponse = await fetch(
      `${BOT_API_BASE.replace(/\/$/, "")}/api/manual-sell`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          mint,
        }),
      }
    );

    const payload = await botResponse.json().catch(() => null);

    if (!botResponse.ok) {
      console.error("Bot manual-sell failed:", payload);
      return res.status(502).json({
        error: "bot_service_failed",
        details: payload,
      });
    }

    // --------------------------------------------------
    // Success
    // --------------------------------------------------
    return res.json(payload);

  } catch (err) {
    console.error("manual-sell API error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
