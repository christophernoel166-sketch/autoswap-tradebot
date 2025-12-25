import express from "express";
import http from "http";
import cors from "cors";
import { Server as IOServer } from "socket.io";
import mongoose from "mongoose";

import tradesApi from "./trades.js";
import usersApi from "./users.js";
import statsApi from "./stats.js";
import analyticsApi from "./analytics.js";
import channelsApi from "./channels.js";
import activePositionsRoute from "./activePositions.js";
import manualSellRoute from "./manualSell.js";
import tradeHistoryRoute from "./tradeHistory.js";

import tradeRecordRoute from "../../routes/tradeRecordRoute.js";
import notificationRoute from "../../routes/notificationRoute.js";
import authWalletRouter from "../../routes/authWallet.js";
import updateSettingsRoute from "../../routes/updateSettingsRoute.js";
import channelsRoutes from "../../routes/channels.js";
import adminChannels from "../../routes/adminChannels.js";

export function createApiServer({ port = 4000 } = {}) {
  const app = express();
  const server = http.createServer(app);

  const io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // ─────────────────────────────────────────────
  // MIDDLEWARE
  // ─────────────────────────────────────────────
  app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
  app.use(express.json());

  // Attach socket.io to request
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // ─────────────────────────────────────────────
  // HEALTH CHECK (CRITICAL FOR RAILWAY)
  // ─────────────────────────────────────────────
  app.get("/health", async (req, res) => {
    const mongoState = mongoose.connection.readyState;

    res.status(200).json({
      ok: true,
      service: "autoswap-tradebot-api",
      mongo:
        mongoState === 1
          ? "connected"
          : mongoState === 2
          ? "connecting"
          : mongoState === 0
          ? "disconnected"
          : "unknown",
      timestamp: new Date().toISOString(),
    });
  });

  // Backward-compatible path
  app.get("/api/health", (req, res) =>
    res.status(200).json({ ok: true })
  );

  // ─────────────────────────────────────────────
  // API ROUTES
  // ─────────────────────────────────────────────
  app.use("/api/trades", tradesApi);
  app.use("/api/trades/record", tradeRecordRoute);
  app.use("/api/users", usersApi);
  app.use("/api/users", updateSettingsRoute);
  app.use("/api/trades", tradeHistoryRoute);
  app.use("/api/stats", statsApi);
  app.use("/api/analytics", analyticsApi);
  app.use("/api/notifications", notificationRoute);
  app.use("/api/channels", channelsApi);
  app.use("/api/channels", channelsRoutes);
  app.use("/api/admin", adminChannels);
  app.use("/api/active-positions", activePositionsRoute);
  app.use("/api/manual-sell", manualSellRoute);
  app.use("/auth", authWalletRouter);

  // ─────────────────────────────────────────────
  // SOCKET.IO
  // ─────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id);
  });

  // ─────────────────────────────────────────────
  // START SERVER
  // ─────────────────────────────────────────────
  function listen() {
    server.listen(port, () => {
      console.log(`✅ API server running on port ${port}`);
    });
  }

  return { app, server, io, listen };
}
