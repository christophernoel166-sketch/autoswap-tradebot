

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

 const queueLength = await redis.rpush(
  QUEUE_NAME,
  JSON.stringify({
    telegramUserId,
    telegramChannelId,
    message,
    parseMode,
    createdAt: Date.now(),
  })
);

console.log(
  "🔎 [TelegramQueue] Job enqueued:",
  {
    queue: QUEUE_NAME,
    telegramUserId,
    telegramChannelId,
    queueLength,
    message,
    parseMode,
  }
);
}
// =====================================================
// POP TELEGRAM JOB
// =====================================================

const telegramQueueRedis = redis.duplicate();
const telegramQueueProbeRedis = redis.duplicate();

telegramQueueRedis.on("connect", () => {
  console.log(
    "🔎 [TelegramQueueRedis] duplicate connection established"
  );
});

telegramQueueRedis.on("ready", () => {
  console.log(
    "🔎 [TelegramQueueRedis] duplicate connection ready"
  );
});

telegramQueueRedis.on("error", (err) => {
  console.error(
    "❌ [TelegramQueueRedis] duplicate connection error:",
    err?.message || err
  );
});

telegramQueueRedis.on("close", () => {
  console.warn(
    "⚠️ [TelegramQueueRedis] duplicate connection closed"
  );
});

telegramQueueRedis.on("reconnecting", () => {
  console.warn(
    "🔄 [TelegramQueueRedis] duplicate connection reconnecting"
  );
});

console.log(
  "🔎 [TelegramQueueRedis] initial status:",
  telegramQueueRedis.status
);


export async function dequeueTelegramNotification() {

  console.log(
    "🔎 [TelegramQueueRedis] Queue length before BRPOP:",
    await telegramQueueRedis.llen(QUEUE_NAME)
  );

  console.log(
    "🔎 [TelegramQueueRedis] Starting BRPOP..."
  );

  const res = await telegramQueueRedis.brpop(
    QUEUE_NAME,
    0
  );

  console.log(
    "🔎 [TelegramQueueRedis] BRPOP completed:",
    res
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