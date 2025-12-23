import express from "express";
import Trade from "../models/Trade.js";

const router = express.Router();

// Save completed trade
router.post("/complete", async (req, res) => {
    try {
        const trade = await Trade.create({
            tradeId: req.body.tradeId,
            tokenMint: req.body.tokenMint,
            buyTxid: req.body.buyTxid,
            sellTxid: req.body.sellTxid,
            amount: req.body.amount,
            status: "completed",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.json({ success: true, trade });
    } catch (err) {
        console.error("❌ Error saving completed trade:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
