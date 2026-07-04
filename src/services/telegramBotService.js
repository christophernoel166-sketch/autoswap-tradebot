let botInstance = null;

// =====================================================
// REGISTER TELEGRAM BOT
// =====================================================

export function setTelegramBot(bot) {

  botInstance = bot;

  console.log(
    "✅ Telegram Bot service initialized."
  );

}

// =====================================================
// GET TELEGRAM BOT
// =====================================================

export function getTelegramBot() {
  return botInstance;
}

// =====================================================
// CHECK IF BOT EXISTS
// =====================================================

export function hasTelegramBot() {
  return botInstance !== null;
}