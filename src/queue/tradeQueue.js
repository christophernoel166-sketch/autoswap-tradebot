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
 * INTERNAL HELPERS
 * ========================================
 */

function parseQueuePayload(payload, type = "job") {
  try {
    return JSON.parse(payload);
  } catch (err) {
    console.warn(`⚠️ Failed to parse ${type} JSON:`, payload);
    return null;
  }
}

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

/**
 * Blocking pop:
 * waits until a buy job exists instead of polling Redis repeatedly.
 *
 * BRPOP response is usually:
 *   [queueName, payload]
 */
export async function popBuyJob() {
  try {
    const res = await redis.brpop(buyQueueKey(), 0);
    if (!res) return null;

    const payload = Array.isArray(res) ? res[1] : res;
    if (!payload) return null;

    return parseQueuePayload(payload, "buy job");
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

/**
 * Blocking pop:
 * waits until a sell job exists instead of polling Redis repeatedly.
 *
 * BRPOP response is usually:
 *   [queueName, payload]
 */
export async function popSellJob() {
  try {
    const res = await redis.brpop(sellQueueKey(), 0);
    if (!res) return null;

    const payload = Array.isArray(res) ? res[1] : res;
    if (!payload) return null;

    return parseQueuePayload(payload, "sell job");
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

export async function releaseBuyLock(walletAddress, mint) {
  try {
    const key = buyLockKey(walletAddress, mint);
    await redis.del(key);
    return true;
  } catch (err) {
    console.error("❌ releaseBuyLock failed:", err?.message || err);
    return false;
  }
}

export async function releaseSellLock(walletAddress, mint) {
  try {
    const key = sellLockKey(walletAddress, mint);
    await redis.del(key);
    return true;
  } catch (err) {
    console.error("❌ releaseSellLock failed:", err?.message || err);
    return false;
  }
}