import { redis } from "../utils/redis.js";

const QUEUE_NAME = "telegram:notifications";

// =====================================================
// PUSH TELEGRAM JOB
// =====================================================

export async function enqueueTelegramNotification({
  telegramUserId = null,
  telegramChannelId = null,
  message,
  parseMode = "HTML",
}) {
  // -----------------------------------------------
  // Require a destination
  // -----------------------------------------------

  if (
    (!telegramUserId && !telegramChannelId) ||
    !message
  ) {
    return;
  }

  await redis.rpush(
    QUEUE_NAME,
    JSON.stringify({
      telegramUserId,
      telegramChannelId,
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
  console.log(
    "🔎 [TelegramQueue] Waiting for notification job..."
  );

  const res = await telegramQueueRedis.brpop(
    QUEUE_NAME,
    0
  );

  console.log(
    "🔎 [TelegramQueue] BRPOP returned:",
    res ? "JOB RECEIVED" : "NO JOB"
  );

  if (!res) {
    return null;
  }

  const payload = Array.isArray(res)
    ? res[1]
    : res;

  if (!payload) {
    console.log(
      "⚠️ [TelegramQueue] Job received but payload is empty."
    );
    return null;
  }

  console.log(
    "🔎 [TelegramQueue] Payload received from Redis."
  );

  const job = JSON.parse(payload);

  console.log(
    "🔎 [TelegramQueue] Job parsed:",
    {
      telegramUserId: job.telegramUserId,
      telegramChannelId: job.telegramChannelId,
      hasMessage: Boolean(job.message),
      parseMode: job.parseMode,
    }
  );

  return job;
}