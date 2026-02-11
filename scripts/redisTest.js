// scripts/redisTest.js
import "dotenv/config";
import { redis } from "../src/utils/redis.js";

async function testRedis() {
  try {
    console.log("🔌 Connecting to Redis...");

    // Wait until Redis is ready
    await redis.ping();
    console.log("✅ Redis ping: PONG");

    await redis.set("test:key", "hello");
    const value = await redis.get("test:key");

    console.log("✅ Redis get:", value);

    await redis.del("test:key");

    console.log("🎉 Redis test successful");
  } catch (err) {
    console.error("❌ Redis test failed:", err);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
}

testRedis();
