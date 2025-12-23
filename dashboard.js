import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { spawn } from "child_process";
import StartTrade from "../components/StartTrade";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ✅ 1. CONNECT TO MONGODB
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.MONGODB_DB,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
  });

// ✅ 2. API ROUTE - Start Trade
app.post("/api/start-trade", async (req, res) => {
  const { walletAddress, mintAddress, tp1, tp2, tp3, sl, trailing } = req.body;

  console.log("📩 Received trade request:", req.body);

  if (!walletAddress || !mintAddress) {
    return res
      .status(400)
      .json({ error: "Wallet address and mint address are required." });
  }

  try {
    // ✅ Launch your autoTrade-trailing.js as a child process
    const process = spawn("node", ["autoTrade-trailing.js"], {
      env: {
        ...process.env,
        WALLET_ADDRESS: walletAddress,
        MINT_ADDRESS: mintAddress,
        TP1: tp1,
        TP2: tp2,
        TP3: tp3,
        SL: sl,
        TRAILING: trailing,
      },
    });

    process.stdout.on("data", (data) => {
      console.log(`🟢 BOT: ${data}`);
    });

    process.stderr.on("data", (data) => {
      console.error(`🔴 BOT ERROR: ${data}`);
    });

    res.json({ message: "Trading started successfully!" });
  } catch (err) {
    console.error("❌ Error starting trade:", err);
    res.status(500).json({ error: "Failed to start trading bot." });
  }
});

// ✅ 3. START THE SERVER
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
