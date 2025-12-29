import { config } from "../config.js";

if (process.env.ENABLE_TELEGRAM_BOT !== "true") {
  console.log("🚫 Telegram bot disabled in this service");
  process.exit(0);
}

// Only import bot logic if enabled
import "./init.js";
