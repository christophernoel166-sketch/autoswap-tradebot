// telegram/init.js
import { Telegraf } from "telegraf";
import { registerSettingsUI } from "./ui.js";
import { registerManualCommands } from "./commands.js";

export async function initTelegram(botToken, notifyFn) {
  if (!botToken) {
    console.log("⚠️ No TELEGRAM_BOT_TOKEN provided. Telegram bot disabled.");
    return null;
  }

  try {
    console.log("🔎 Initializing Telegram bot...");

    const bot = new Telegraf(botToken);

    // 1. Register UI (tabs, /menu, /settings)
    registerSettingsUI(bot);

    // 2. Register trading commands (manual_buy, sell, preview)
    registerManualCommands(bot, notifyFn);

    // 3. SAFEST polling mode for Windows / Nigeria ISPs
    await bot.launch({
      polling: {
        timeout: 5,
        limit: 1
      },
      dropPendingUpdates: true
    });

    console.log("✅ Telegram bot launched successfully.");
    console.log("✅ Use /menu or /settings to begin.");

    return bot;

  } catch (err) {
    console.error("❌ Telegram initialization error:", err.message || err);
    return null;
  }
}
