import express from "express";
import http from "http";
import cors from "cors";
import { Server as IOServer } from "socket.io";

import tradesApi from "./trades.js";
import usersApi from "./users.js";
import statsApi from "./stats.js";
import tradeRecordRoute from "../../routes/tradeRecordRoute.js";
import analyticsApi from "./analytics.js";
import notificationRoute from "../../routes/notificationRoute.js";
import channelsApi from "./channels.js";
import authWalletRouter from "../../routes/authWallet.js";
import updateSettingsRoute from "../../routes/updateSettingsRoute.js";
import activePositionsRoute from "./activePositions.js";
import manualSellRoute from "./manualSell.js";
import tradeHistoryRoute from "./tradeHistory.js";
import channelsRoutes from "../../routes/channels.js";
import adminChannels from "../../routes/adminChannels.js";

export function createApiServer() {
  const app = express();
  const server = http.createServer(app);

  const io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
  app.use(express.json());

  // Attach socket.io to requests
  app.use((req, _res, next) => {
    req.io = io;
    next();
  });

  /**
   * ============================
   * ROOT ROUTE (IMPORTANT)
   * ============================
   * Prevents "Cannot GET /"
   * Confirms app is alive
   */
  app.get("/", (_req, res) => {
    res.status(200).json({
      service: "autoswap-tradebot",
      status: "running",
      message: "API is live",
      health: "/api/health",
      timestamp: Date.now(),
    });
  });

  /**
   * ============================
   * HEALTH CHECK (Railway)
   * ============================
   */
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  /**
   * ============================
   * API ROUTES
   * ============================
   */
  app.use("/api/trades", tradesApi);
  app.use("/api/trades/record", tradeRecordRoute);
  app.use("/api/users", usersApi);
  app.use("/api/users", updateSettingsRoute);
  app.use("/api/trades", tradeHistoryRoute);
  app.use("/api/stats", statsApi);
  app.use("/api/channels", channelsApi);
  app.use("/api/analytics", analyticsApi);
  app.use("/api/notifications", notificationRoute);
  app.use("/auth", authWalletRouter);
  app.use("/api/active-positions", activePositionsRoute);
  app.use("/api/manual-sell", manualSellRoute);
  app.use("/api/channels", channelsRoutes);
  app.use("/api/admin", adminChannels);

  /**
   * ============================
   * NOTE: Socket.io
   * ============================
   */
  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id);
  });

  /**
   * ============================
   * START SERVER
   * ============================
   */
  function listen() {
    const port = Number(process.env.PORT);
    if (!port) {
      throw new Error("PORT is not defined (Railway injects process.env.PORT)");
    }

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ API server listening on port ${port}`);
    });
  }

  return { app, server, io, listen };
}
