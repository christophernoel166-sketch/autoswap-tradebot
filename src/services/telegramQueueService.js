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

const telegramQueueRedis = redis.duplicate();

export async function dequeueTelegramNotification() {

  const res = await telegramQueueRedis.brpop(
    QUEUE_NAME,
    0
  );

  if (!res) {
    return null;
  }

  const payload = Array.isArray(res)
    ? res[1]
    : res;

  if (!payload) {
    return null;
  }

  return JSON.parse(payload);

}