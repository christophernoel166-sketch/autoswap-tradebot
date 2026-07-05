import { redis } from "../utils/redis.js";

const QUEUE_NAME = "telegram:notifications";

// =====================================================
// PUSH TELEGRAM JOB
// =====================================================

export async function enqueueTelegramNotification({
  telegramUserId,
  message,
  parseMode = "HTML",
}) {

  if (!telegramUserId || !message) {
    return;
  }

  await redis.rpush(
    QUEUE_NAME,
    JSON.stringify({
      telegramUserId,
      message,
      parseMode,
      createdAt: Date.now(),
    })
  );

}

// =====================================================
// POP TELEGRAM JOB
// =====================================================

export async function dequeueTelegramNotification() {

  const payload =
    await redis.lpop(QUEUE_NAME);

  if (!payload) {
    return null;
  }

  return JSON.parse(payload);

}