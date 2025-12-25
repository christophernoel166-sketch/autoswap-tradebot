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



export function createApiServer({ port = 4000 } = {}) {
  const app = express();
  const server = http.createServer(app);

  const io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
  app.use(express.json());

  // attach socket
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // API ROUTES
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




  app.get("/api/health", (req, res) => res.json({ ok: true }));

  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);
  });

  function listen() {
    server.listen(port, () => {
      console.log(`✅ API server running on http://localhost:${port}`);
    });
  }

  return { app, server, io, listen };
}
