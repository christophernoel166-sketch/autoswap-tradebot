import express from "express";
import User from "../models/User.js";

const router = express.Router();

/**
 * POST /api/users/update-settings
 */
router.post("/", async (req, res) => {
  try {
    const {
      walletAddress,
      solPerTrade,
      tp1,
      tp1SellPercent,
      tp2,
      tp2SellPercent,
      tp3,
      tp3SellPercent,
      stopLoss,
      trailingTrigger,
      trailingDistance,
    } = req.body;

    if (!walletAddress)
      return res.status(400).json({ error: "walletAddress required" });

    let user = await User.findOne({ walletAddress });
    if (!user)
      return res.status(404).json({ error: "user_not_found" });

    const updates = {};

    if (solPerTrade !== undefined) updates.solPerTrade = Number(solPerTrade);
    if (tp1 !== undefined) updates.tp1 = Number(tp1);
    if (tp1SellPercent !== undefined) updates.tp1SellPercent = Number(tp1SellPercent);
    if (tp2 !== undefined) updates.tp2 = Number(tp2);
    if (tp2SellPercent !== undefined) updates.tp2SellPercent = Number(tp2SellPercent);
    if (tp3 !== undefined) updates.tp3 = Number(tp3);
    if (tp3SellPercent !== undefined) updates.tp3SellPercent = Number(tp3SellPercent);
    if (stopLoss !== undefined) updates.stopLoss = Number(stopLoss);
    if (trailingTrigger !== undefined) updates.trailingTrigger = Number(trailingTrigger);
    if (trailingDistance !== undefined) updates.trailingDistance = Number(trailingDistance);

    Object.assign(user, updates);
    await user.save();

    return res.json({ ok: true, user });
  } catch (err) {
    console.error("update-settings error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
