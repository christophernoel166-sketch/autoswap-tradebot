// utils/saveTrade.js
// Standardized helper for saving trade records into dashboard DB

import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const BACKEND_BASE =
  process.env.BACKEND_BASE ||
  process.env.VITE_API_BASE ||
  "http://localhost:4000";

/**
 * Save trade record to backend dashboard.
 */
export default async function saveTelegramTradeToBackend(trade) {
  try {
    const url = `${BACKEND_BASE.replace(/\/$/, "")}/api/trades/record`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(
        "❌ Failed to save trade to backend:",
        res.status,
        txt
      );
      return false;
    }

    console.log("✅ Trade saved:", trade.mint, trade.reason);
    return true;
  } catch (err) {
    console.error("❌ saveTrade error:", err);
    return false;
  }
}
