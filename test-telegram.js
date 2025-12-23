import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// 👉 replace with your REAL channel ID (recommended)
const CHANNEL_ID = -1003632913103;

(async () => {
  try {
    await bot.telegram.sendMessage(
      CHANNEL_ID,
      "✅ Test message from AutoSwap bot"
    );
    console.log("Message sent successfully");
  } catch (err) {
    console.error("Failed to send message:", err);
  }
})();
