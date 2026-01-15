// telegram/index.js
if (process.env.ENABLE_TELEGRAM_BOT !== "true") {
  console.log("🚫 Telegram bot disabled in this service");
  process.exit(0);
}

import "./init.js";
