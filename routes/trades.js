// routes/trades.js
import express from "express";
import Trade from "../models/Trade.js";

const router = express.Router();

// GET all trades (dashboard uses this)
router.get("/", async (req, res) => {
  try {
    const trades = await Trade.find().sort({ createdAt: -1 });
    res.json(trades);
  } catch (err) {
    console.error("❌ Error fetching trades:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /record  (autoTrade-trailing.js uses this endpoint)
router.post("/record", async (req, res) => {
  try {
    const trade = await Trade.create(req.body);

    // If socket.io is attached, broadcast live updates
    if (req.io) req.io.emit("trade_update", trade);

    res.json({ success: true, trade });
  } catch (err) {
    console.error("❌ Error saving trade:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
