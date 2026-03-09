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
  const payload = JSON.stringify(job);
  await redis.rpush(buyQueueKey(), payload);
}

export async function popBuyJob() {
  const res = await redis.lpop(buyQueueKey());
  if (!res) return null;

  try {
    return JSON.parse(res);
  } catch {
    return null;
  }
}

/**
 * ========================================
 * SELL QUEUE
 * ========================================
 */

export async function enqueueSellJob(job) {
  const payload = JSON.stringify(job);
  await redis.rpush(sellQueueKey(), payload);
}

export async function popSellJob() {
  const res = await redis.lpop(sellQueueKey());
  if (!res) return null;

  try {
    return JSON.parse(res);
  } catch {
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
  const key = buyLockKey(walletAddress, mint);

  const ok = await redis.set(key, "1", {
    NX: true,
    EX: BUY_LOCK_TTL,
  });

  return ok === "OK";
}

/**
 * ========================================
 * SELL LOCK
 * Prevent duplicate sell jobs
 * ========================================
 */

export async function acquireSellLock(walletAddress, mint) {
  const key = sellLockKey(walletAddress, mint);

  const ok = await redis.set(key, "1", {
    NX: true,
    EX: SELL_LOCK_TTL,
  });

  return ok === "OK";
}