import dotenv from "dotenv";
import mongoose from "mongoose";
import pino from "pino";
import { createApiServer } from "./src/api/server.js";

dotenv.config();

const log = pino({ level: "info" });

mongoose.connection.on("connected", () => {
  log.info("✅ MongoDB connection state: connected");
});

mongoose.connection.on("disconnected", () => {
  log.warn("⚠️ MongoDB connection state: disconnected");
});

mongoose.connection.on("error", (err) => {
  log.error("❌ MongoDB connection error:", err);
});

async function main() {
  log.info("🚀 Starting API service (Telegram disabled)");

  // --------------------
  // MongoDB
  // --------------------
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "solana_tradebot",
  });

  log.info("✅ Connected to MongoDB");

  // --------------------
  // API SERVER
  // --------------------
  const { listen } = createApiServer();

  // 🚨 THIS IS WHAT RAILWAY CARES ABOUT
  listen();

  log.info(`🌐 API Server bound to PORT=${process.env.PORT}`);
}

main().catch((err) => {
  console.error("🔥 Fatal startup error:", err);
  process.exit(1);
});
