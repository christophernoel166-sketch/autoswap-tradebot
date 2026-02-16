import express from "express";
import http from "http";
import cors from "cors";
import { Server as IOServer } from "socket.io";

// APIs & routes
import tradesApi from "./trades.js";
import usersApi from "./users.js";
import statsApi from "./stats.js";
import analyticsApi from "./analytics.js";
import channelsApi from "./channels.js";
import activePositionsApi from "./activePositions.js";

import manualSellApi from "./manualSell.js";
import tradeHistoryRoute from "./tradeHistory.js";

import tradeRecordRoute from "../../routes/tradeRecordRoute.js";
import notificationRoute from "../../routes/notificationRoute.js";
import authWalletRouter from "../../routes/authWallet.js";
import updateSettingsRoute from "../../routes/updateSettingsRoute.js";
import channelsRoutes from "../../routes/channels.js";
import adminChannels from "../../routes/adminChannels.js";
import withdrawRouter from "../../routes/withdraw.js";
import channelsRouter from "./channels.js";

import withdrawApi from "./withdraw.js";
import adminFees from "./adminFees.js";
import userBalance from "./userBalance.js";
import userDeposits from "./userDeposits.js";
import userWithdrawals from "./userWithdrawals.js";
import walletHistory from "./walletHistory.js";

export function createApiServer() {
  const app = express();
  const server = http.createServer(app);

  // ============================
  // ✅ GLOBAL CORS (FIXED)
  // ============================
  app.use(
    cors({
      origin: [
        "https://www.autoswaps.online",
        "https://autoswaps.online",
        "http://localhost:5173",
        "http://localhost:3000",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  app.use(express.json());

  // ============================
  // Socket.io
  // ============================
  const io = new IOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Attach socket.io to requests
  app.use((req, _res, next) => {
    req.io = io;
    next();
  });

  // ============================
  // ROOT ROUTE
  // ============================
  app.get("/", (_req, res) => {
    res.status(200).json({
      service: "autoswap-tradebot",
      status: "running",
      health: "/api/health",
      timestamp: Date.now(),
    });
  });

  // ============================
  // HEALTH CHECK (Railway)
  // ============================
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  // ============================
  // API ROUTES
  // ============================
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
  app.use("/api/active-positions", activePositionsApi);


  app.use("/api", manualSellApi);
  app.use("/api/channels", channelsRoutes);
  app.use("/api/admin", adminChannels);
  
  app.use("/api", withdrawApi);
  app.use("/api/admin", adminFees);
  app.use("/api", userBalance);
  app.use("/api", userDeposits);
  app.use("/api/withdrawals", userWithdrawals);
  app.use("/api/wallet", walletHistory);

  // ============================
  // Socket.io connection
  // ============================
  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id);
  });

  // ============================
  // START SERVER
  // ============================
  function listen() {
    const port = Number(process.env.PORT);
    if (!port) {
      throw new Error("PORT is not defined");
    }

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ API server listening on port ${port}`);
    });
  }

  return { app, server, io, listen };
}
