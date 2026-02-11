// src/utils/redis.js
import dotenv from "dotenv";
import Redis from "ioredis";

// ✅ Load env vars at module load time
dotenv.config();

const { REDIS_URL } = process.env;

if (!REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Upstash + long-lived connections
  enableReadyCheck: true,
});
