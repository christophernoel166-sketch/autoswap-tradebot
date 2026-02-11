// src/utils/redisKeys.js

export const REDIS_KEYS = {
  COMMAND_QUEUE: "bot:commands",          // LIST
  RESULT_PREFIX: "bot:result:",           // STRING + TTL
  LOCK_PREFIX: "bot:lock:",               // STRING + TTL
};
