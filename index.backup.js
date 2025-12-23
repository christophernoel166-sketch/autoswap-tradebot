// index.js — Unified Solana Auto + Manual Trader bot launcher

import mongoose from "mongoose";
import pino from "pino";
import { config } from "./config.js";
import { createBot } from "./bot/telegramBot.js";

const logger = pino({ level: "info" });

async function main() {
  logger.info("🚀 Starting Unified Solana Trader...");

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info("✅ Connected to MongoDB");
  } catch (err) {
    logger.error("❌ MongoDB connection failed: " + err.message);
    process.exit(1);
  }

  // Initialize Telegram Bot
  const bot = createBot();

  // Use long polling (default)
  bot.launch();
  logger.info("🤖 Telegram bot launched successfully!");

  // Graceful shutdown handling
  process.once("SIGINT", () => {
    logger.warn("SIGINT received, shutting down...");
    bot.stop("SIGINT");
    mongoose.disconnect();
  });

  process.once("SIGTERM", () => {
    logger.warn("SIGTERM received, shutting down...");
    bot.stop("SIGTERM");
    mongoose.disconnect();
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
