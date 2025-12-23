import express from "express";
const router = express.Router();

router.post("/start-trade", async (req, res) => {
  try {
    const {
      walletAddress,
      mintAddress,
      tradeAmount,
      tp1,
      tp2,
      tp3,
      stopLoss,
      trailingStop,
      distanceStopLoss,
    } = req.body;

    if (!walletAddress || !mintAddress || !tradeAmount) {
      return res.status(400).json({
        error: "Missing required fields: walletAddress, mintAddress, or tradeAmount.",
      });
    }

    console.log("🚀 Trade request received:");
    console.log({
      walletAddress,
      mintAddress,
      tradeAmount,
      tp1,
      tp2,
      tp3,
      stopLoss,
      trailingStop,
      distanceStopLoss,
    });

    // ✅ Later you can plug your Solana trade logic here.
    return res.json({
      success: true,
      message: `Trade started for token ${mintAddress} using ${tradeAmount} SOL.`,
    });
  } catch (error) {
    console.error("❌ Error starting trade:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
