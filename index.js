import dotenv from "dotenv";
import mongoose from "mongoose";
import pino from "pino";
import { createApiServer } from "./src/api/server.js";
import "./bot/telegramBot.js"; // Telegram bot starts on import

dotenv.config();

const log = pino({ level: "info" });

async function main() {
  log.info("🚀 Starting Unified Solana Trader...");

  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "solana_tradebot",
    });
    log.info("✅ Connected to MongoDB");
  } catch (err) {
    log.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }

  // Start Express + Socket.io API Server
  try {
    const { listen } = createApiServer({
      port: process.env.PORT || 4000,
    });
    listen();
    log.info(`🌐 API Server is running on port ${process.env.PORT || 4000}`);
  } catch (err) {
    log.error("❌ Failed to start API server:", err);
    process.exit(1);
  }

  // Telegram bot is already started from import
  log.info("🤖 Telegram bot launched successfully!");
}

// Global error handler
main().catch((err) => {
  console.error("🔥 Fatal startup error:", err);
  process.exit(1);
});
