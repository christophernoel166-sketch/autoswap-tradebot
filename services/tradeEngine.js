import Trade from "../models/Trade.js";
import axios from "axios";


// Function to fetch current SOL price
async function getSolPrice() {
  try {
    const response = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
    return parseFloat(response.data.price);
  } catch (error) {
    console.error("❌ Failed to fetch SOL price:", error.message);
    return null;
  }
}

// Trading Engine (runs every 10 seconds)
async function runTradeEngine() {
  const openTrades = await Trade.find({ status: "open" });

  if (openTrades.length === 0) {
    console.log("✅ No active trades at the moment.");
    return;
  }

  const currentPrice = await getSolPrice();
  if (!currentPrice) return;

  console.log(`📌 Current SOL Price: $${currentPrice}`);

  for (const trade of openTrades) {
    const { entryPrice, takeProfit, stopLoss } = trade;

    // ✅ Take Profit
    if (currentPrice >= takeProfit) {
      trade.status = "closed";
      await trade.save();
      console.log(`✅ TRADE CLOSED (TAKE PROFIT) at $${currentPrice}`);
    }

    // ✅ Stop Loss
    else if (currentPrice <= stopLoss) {
      trade.status = "closed";
      await trade.save();
      console.log(`❌ TRADE CLOSED (STOP LOSS) at $${currentPrice}`);
    }
  }
}

// Run every 10 seconds
setInterval(runTradeEngine, 10_000);

export default runTradeEngine;

