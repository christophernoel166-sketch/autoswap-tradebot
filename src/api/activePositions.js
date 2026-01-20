import express from "express";
import User from "../../models/User.js";

const router = express.Router();

/**
 * GET /api/active-positions/wallet/:wallet
 * DB-owned active positions (no bot proxy)
 */
router.get("/wallet/:wallet", async (req, res) => {
  try {
    const wallet = String(req.params.wallet);

    const user = await User.findOne({ walletAddress: wallet }).lean();

    if (!user) {
      return res.json({ positions: [] });
    }

    // If you store positions in DB (future-proof)
    const positions = user.activePositions || [];

    return res.json({ positions });

  } catch (err) {
    console.error("active-positions API error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
