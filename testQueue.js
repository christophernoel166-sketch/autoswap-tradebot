import { enqueueTelegramNotification } from "./src/services/telegramQueueService.js";

console.log("🚀 Queue test starting...");

await enqueueTelegramNotification({
  telegramUserId: "7959932324",
  message: "✅ Direct Redis Queue Test from Autoswaps",
  parseMode: "HTML",
});

console.log("✅ Message queued.");

process.exit(0);