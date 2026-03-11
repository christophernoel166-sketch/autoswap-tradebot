import { redis } from "../utils/redis.js";
import {
  buyQueueKey,
  sellQueueKey,
  buyLockKey,
  sellLockKey,
} from "../redis/tradeQueueKeys.js";

const BUY_LOCK_TTL = 120; // seconds
const SELL_LOCK_TTL = 120;

/**
 * ========================================
 * BUY QUEUE
 * ========================================
 */

export async function enqueueBuyJob(job) {
  try {
    const payload = JSON.stringify(job);
    await redis.rpush(buyQueueKey(), payload);
  } catch (err) {
    console.error("❌ enqueueBuyJob failed:", err?.message || err);
    throw err;
  }
}

export async function popBuyJob() {
  try {
    const res = await redis.lpop(buyQueueKey());
    if (!res) return null;

    try {
      return JSON.parse(res);
    } catch (err) {
      console.warn("⚠️ Failed to parse buy job JSON:", res);
      return null;
    }
  } catch (err) {
    console.error("❌ popBuyJob failed:", err?.message || err);
    return null;
  }
}

/**
 * ========================================
 * SELL QUEUE
 * ========================================
 */

export async function enqueueSellJob(job) {
  try {
    const payload = JSON.stringify(job);
    await redis.rpush(sellQueueKey(), payload);
  } catch (err) {
    console.error("❌ enqueueSellJob failed:", err?.message || err);
    throw err;
  }
}

export async function popSellJob() {
  try {
    const res = await redis.lpop(sellQueueKey());
    if (!res) return null;

    try {
      return JSON.parse(res);
    } catch (err) {
      console.warn("⚠️ Failed to parse sell job JSON:", res);
      return null;
    }
  } catch (err) {
    console.error("❌ popSellJob failed:", err?.message || err);
    return null;
  }
}

/**
 * ========================================
 * BUY LOCK
 * Prevent duplicate buy jobs
 * ========================================
 */

export async function acquireBuyLock(walletAddress, mint) {
  try {
    const key = buyLockKey(walletAddress, mint);

    const ok = await redis.set(
      key,
      "1",
      "EX",
      BUY_LOCK_TTL,
      "NX"
    );

    return ok === "OK";
  } catch (err) {
    console.error("❌ acquireBuyLock failed:", err?.message || err);
    return false;
  }
}

/**
 * ========================================
 * SELL LOCK
 * Prevent duplicate sell jobs
 * ========================================
 */

export async function acquireSellLock(walletAddress, mint) {
  try {
    const key = sellLockKey(walletAddress, mint);

    const ok = await redis.set(
      key,
      "1",
      "EX",
      SELL_LOCK_TTL,
      "NX"
    );

    return ok === "OK";
  } catch (err) {
    console.error("❌ acquireSellLock failed:", err?.message || err);
    return false;
  }
}