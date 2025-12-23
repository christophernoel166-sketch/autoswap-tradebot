import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import User from "../../models/User.js";

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing");
}

/**
 * ✅ SINGLE Telegram bot instance
 */
const bot = new Telegraf(BOT_TOKEN);

/**
 * ===================================================
 * STEP 6.1 — TELEGRAM LINK START
 * Triggered by:
 * https://t.me/YOUR_BOT_USERNAME?start=link
 * ===================================================
 */
bot.start(async (ctx) => {
  try {
    const payload = ctx.startPayload; // e.g. "link"

    if (payload !== "link") {
      return ctx.reply(
        "👋 Welcome!\n\nUse the dashboard to begin linking your wallet."
      );
    }

    // Save Telegram identity temporarily (no wallet yet)
    const telegramUser = ctx.from;

    await ctx.reply(
      `🔗 *Link Telegram Account*\n\n` +
        `Please reply with your *wallet address* to complete linking.\n\n` +
        `⚠️ This Telegram account can be linked to *only one wallet*.`,
      { parse_mode: "Markdown" }
    );

    // Mark session state
    ctx.session = ctx.session || {};
    ctx.session.awaitingWalletLink = true;
  } catch (err) {
    console.error("start link error:", err);
    ctx.reply("❌ Failed to start linking process.");
  }
});

export default bot;
