import dotenv from "dotenv";
import mongoose from "mongoose";
import pino from "pino";
import { createApiServer } from "./src/api/server.js";

dotenv.config();

const log = pino({ level: "info" });

let mongoConnected = false;

/**
 * Track MongoDB connection state
 */
mongoose.connection.on("connected", () => {
  mongoConnected = true;
  log.info("✅ MongoDB connection state: connected");
});

mongoose.connection.on("disconnected", () => {
  mongoConnected = false;
  log.warn("⚠️ MongoDB connection state: disconnected");
});

mongoose.connection.on("error", (err) => {
  mongoConnected = false;
  log.error("❌ MongoDB connection error:", err);
});

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
    const { app, listen } = createApiServer({
      port: process.env.PORT || 4000,
    });

    /**
     * Health check endpoint
     * Used by Railway, uptime monitors, and debugging
     */
    app.get("/health", (_req, res) => {
      const mongoState = mongoose.connection.readyState === 1;

      res.status(mongoState ? 200 : 503).json({
        ok: mongoState,
        mongo: mongoState ? "connected" : "disconnected",
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
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
