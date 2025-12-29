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

  // --------------------------------------------------
  // MongoDB
  // --------------------------------------------------
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "solana_tradebot",
    });
    log.info("✅ Connected to MongoDB");
  } catch (err) {
    log.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }

  // --------------------------------------------------
  // API SERVER
  // --------------------------------------------------
  try {
    const { app, listen } = createApiServer();

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        mongo: mongoose.connection.readyState === 1,
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
    });

    listen();
    log.info(`🌐 API Server listening on ${process.env.PORT}`);
  } catch (err) {
    log.error("❌ Failed to start API server:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("🔥 Fatal startup error:", err);
  process.exit(1);
});
