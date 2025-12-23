// manualTrade.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import { executeUserTrade } from "./autoTrade-trailing.js"; // your main bot script
import { Keypair } from "@solana/web3.js";
import fs from "fs";

// Load Phantom wallet secret key (JSON array of 64 numbers)
const secret = JSON.parse(fs.readFileSync("./phantom-keypair.json"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));


dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Manual trade user object
  const user = {
    telegramId: "manual",   // arbitrary ID for manual trades
    wallet: "Gex4FzUyCz1tqzUc5JCzQXk3WC6jH9a9apzCCbdx6zX7",
    active: true,
    channelProfiles: {
      manual: {
        solAmountPerTrade: 0.1,
        tp1Percent: 10,
        tp1SellPercent: 50,
        tp2Percent: 20,
        tp2SellPercent: 30,
        tp3Percent: 30,
        tp3SellPercent: 20,
        stopLossPercent: 5,
        trailingPercent: 5
      }
    }
  };

  const mint = "8HxW9Z3YT1gXgQcgEynZaHsEpLXRgijGfMYCkaAypump";

  try {
    await executeUserTrade(user, mint, "manual");
    console.log("✅ Manual trade triggered!");
  } catch (err) {
    console.error("❌ Trade failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
