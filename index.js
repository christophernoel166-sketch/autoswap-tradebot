import dotenv from "dotenv";
import mongoose from "mongoose";
import pino from "pino";
import { createApiServer } from "./src/api/server.js";

dotenv.config();

const log = pino({ level: "info" });

// --------------------------------------------------
// MongoDB connection logging
// --------------------------------------------------
mongoose.connection.on("connected", () => {
  log.info("✅ MongoDB connection state: connected");
});

mongoose.connection.on("disconnected", () => {
  log.warn("⚠️ MongoDB connection state: disconnected");
});

mongoose.connection.on("error", (err) => {
  log.error("❌ MongoDB connection error:", err);
});

// --------------------------------------------------
// Main bootstrap
// --------------------------------------------------
async function main() {
  log.info("🚀 Starting API service (Telegram disabled)");

  // --------------------------------------------------
  // ENV VALIDATION (Railway requirement)
  // --------------------------------------------------
  const PORT = Number(process.env.PORT);
  if (!PORT) {
    throw new Error("❌ PORT is not defined (Railway injects this automatically)");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("❌ MONGO_URI is not defined");
  }

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

    // Extra health endpoint (non-namespaced)
    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        service: "autoswap-api",
        mongo: mongoose.connection.readyState === 1,
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
    });

    // Start HTTP server (Railway expects this)
    listen();
    log.info(`🌐 API Server listening on port ${PORT}`);

    // --------------------------------------------------
    // 🚨 CRITICAL: keep Node process alive on Railway
    // --------------------------------------------------
    process.stdin.resume();

  } catch (err) {
    log.error("❌ Failed to start API server:", err);
    process.exit(1);
  }
}

// --------------------------------------------------
// Start
// --------------------------------------------------
main().catch((err) => {
  log.error("🔥 Fatal startup error:", err);
  process.exit(1);
});
