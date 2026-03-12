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
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  tls: {},
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err?.message || err);
});

redis.on("close", () => {
  console.warn("⚠️ Redis connection closed");
});

redis.on("reconnecting", () => {
  console.warn("🔄 Redis reconnecting...");
});