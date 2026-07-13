import bot from "./src/telegram/bot.js";

console.log("================================");
console.log("🚀 Telegram Launch Test Started");
console.log("================================");

try {

  console.log("1️⃣ Calling getMe()...");

  const me = await bot.telegram.getMe();

  console.log("✅ Connected to Telegram");
  console.log(me);

  // =====================================================
  // DELETE ANY EXISTING WEBHOOK
  // =====================================================

  console.log("2️⃣ Deleting webhook...");

  await bot.telegram.deleteWebhook({
    drop_pending_updates: true,
  });

  console.log("✅ Webhook deleted");

  // =====================================================
  // START LONG POLLING
  // =====================================================

  console.log("3️⃣ Calling bot.launch()...");

  await bot.launch();

  console.log("✅ bot.launch() resolved");

} catch (err) {

  console.error("❌ Test failed:");
  console.error(err);

}

process.once("SIGINT", () => {
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
});