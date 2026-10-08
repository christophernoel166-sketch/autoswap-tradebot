

import { redis } from "../utils/redis.js";

const QUEUE_NAME = "telegram:notifications";

const telegramQueueRedis = redis.duplicate();
const telegramQueueProbeRedis = redis.duplicate();





async function logRedisQueueIdentity() {
  console.log(
    "🔎 [TelegramQueueRedis] Redis DB:",
    telegramQueueRedis.options.db
  );




const bridgeTestValue =
  await telegramQueueRedis.get(
    "telegram:queue:bridge:test"
  );

console.log(
  "🔎 [TelegramQueueRedis] Bridge test value:",
  bridgeTestValue
);




  console.log(
    "🔎 [TelegramQueueProbeRedis] Redis DB:",
    telegramQueueProbeRedis.options.db
  );

  console.log(
    "🔎 [Main Redis] Redis DB:",
    redis.options.db
  );
}

logRedisQueueIdentity().catch((err) => {
  console.error(
    "❌ Redis identity diagnostic failed:",
    err?.message || err
  );
});



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


await redis.set(
  "telegram:queue:bridge:test",
  "API-WROTE-THIS",
  "EX",
  60
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


console.log(
  "🔎 [TelegramQueueProbeRedis] Queue length seen after enqueue:",
  await telegramQueueProbeRedis.llen(QUEUE_NAME)
);
}

// =====================================================
// POP TELEGRAM JOB
// =====================================================





telegramQueueProbeRedis.on("connect", () => {
  console.log(
    "🔎 [TelegramQueueProbeRedis] probe connection established"
  );
});

telegramQueueProbeRedis.on("ready", () => {
  console.log(
    "🔎 [TelegramQueueProbeRedis] probe connection ready"
  );
});

telegramQueueProbeRedis.on("error", (err) => {
  console.error(
    "❌ [TelegramQueueProbeRedis] probe connection error:",
    err?.message || err
  );
});



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

  const bridgeTestValue =
    await telegramQueueRedis.get(
      "telegram:queue:bridge:test"
    );

  console.log(
    "🔎 [TelegramQueueRedis] Live bridge test value:",
    bridgeTestValue
  );

  console.log(
    "🔎 [TelegramQueueRedis] Queue length before BRPOP:",
    await telegramQueueRedis.llen(QUEUE_NAME)
  );

  console.log(
    "🔎 [TelegramQueueRedis] Starting BRPOP..."
  );

  const res = await telegramQueueRedis.brpop(
    QUEUE_NAME,
    10
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