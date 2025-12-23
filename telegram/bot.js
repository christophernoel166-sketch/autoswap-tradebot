import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

// 🔹 Create ONE shared bot instance
const bot = new Telegraf(BOT_TOKEN);

export default bot;
