
import { redis } from "../utils/redis.js";

const QUEUE_NAME = "telegram:notifications:test";

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


const notificationPayload = JSON.stringify({
  telegramUserId,
  telegramChannelId,
  message,
  parseMode,
  createdAt: Date.now(),
});

const atomicQueueResult = await redis.eval(
  `
    local queue = KEYS[1]
    local payload = ARGV[1]

    local pushedLength = redis.call(
      "RPUSH",
      queue,
      payload
    )

    local currentLength = redis.call(
      "LLEN",
      queue
    )

    local currentContents = redis.call(
      "LRANGE",
      queue,
      0,
      -1
    )

    return {
      pushedLength,
      currentLength,
      currentContents
    }
  `,
  1,
  QUEUE_NAME,
  notificationPayload
);

const queueLength = Number(atomicQueueResult[0]);
const atomicLength = Number(atomicQueueResult[1]);
const atomicContents = atomicQueueResult[2];

console.log(
  "🔬 [TelegramQueue] ATOMIC REDIS RESULT:",
  {
    queue: QUEUE_NAME,
    pushedLength: queueLength,
    lengthInsideScript: atomicLength,
    contentsInsideScript: atomicContents,
  }
);


console.log(
  "🔎 [TelegramQueue] RPUSH returned:",
  queueLength
);

console.log(
  "🔎 [TelegramQueue] Same-connection LLEN:",
  await redis.llen(QUEUE_NAME)
);




const debugReceiptKey =
  `telegram:receipt:${Date.now()}`;

const debugReceiptPayload = {
  telegramUserId,
  telegramChannelId,
  message,
  parseMode,
  createdAt: Date.now(),
  queueName: QUEUE_NAME,
};

await redis.set(
  debugReceiptKey,
  JSON.stringify(debugReceiptPayload),
  "EX",
  300
);

console.log(
  "🔎 [TelegramQueue] Redis receipt written:",
  {
    key: debugReceiptKey,
    payload: debugReceiptPayload,
  }
);

console.log(
  "🔎 [TelegramQueue] Redis receipt read-back:",
  await redis.get(debugReceiptKey)
);



// =====================================================
// TEMPORARY REDIS DEBUG QUEUE TEST
// =====================================================

const debugQueueKey = "telegram:queue:debug:test";

await redis.rpush(
  debugQueueKey,
  "QUEUE-BRIDGE-TEST"
);

console.log(
  "🔎 [TelegramQueue] Debug queue length after RPUSH:",
  await redis.llen(debugQueueKey)
);

console.log(
  "🔎 [TelegramQueue] Debug queue contents:",
  await redis.lrange(debugQueueKey, 0, -1)
);


// =====================================================
// EXISTING QUEUE DIAGNOSTICS
// =====================================================

console.log(
  "🔎 [TelegramQueue] API queue length immediately after RPUSH:",
  await redis.llen(QUEUE_NAME)
);

console.log(
  "🔎 [TelegramQueue] API queue contents immediately after RPUSH:",
  await redis.lrange(QUEUE_NAME, 0, -1)
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