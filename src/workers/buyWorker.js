import User from "../../models/User.js";
import { popBuyJob } from "../queue/tradeQueue.js";

const BUY_CONCURRENCY = Number(process.env.BUY_CONCURRENCY || 5);
const BUY_POLL_MS = Number(process.env.BUY_POLL_MS || 1000);

let activeBuys = 0;

/**
 * Inject the actual trade executor from your main bot file
 * so this worker stays reusable.
 */
let executeUserTradeHandler = null;

export function registerBuyExecutor(fn) {
  executeUserTradeHandler = fn;
}

async function processOneBuyJob(job) {
  const { walletAddress, mint, channelId } = job || {};

  if (!walletAddress || !mint || !channelId) {
    console.warn("⚠️ Invalid buy job:", job);
    return;
  }

  const user = await User.findOne({ walletAddress }).lean();
  if (!user) {
    console.warn("⚠️ Buy job skipped — user not found:", walletAddress);
    return;
  }

  if (typeof executeUserTradeHandler !== "function") {
    console.warn("⚠️ Buy executor not registered");
    return;
  }

  await executeUserTradeHandler(user, mint, channelId);
}

async function tickBuyWorker() {
  while (activeBuys < BUY_CONCURRENCY) {
    const job = await popBuyJob();
    if (!job) break;

    activeBuys++;

    processOneBuyJob(job)
      .catch((err) => {
        console.error("❌ Buy worker job failed:", {
          err: err?.message || err,
          job,
        });
      })
      .finally(() => {
        activeBuys--;
      });
  }
}

export function startBuyWorker() {
  console.log(`🚀 Buy worker started (concurrency=${BUY_CONCURRENCY})`);

  setInterval(() => {
    tickBuyWorker().catch((err) => {
      console.error("❌ Buy worker tick failed:", err?.message || err);
    });
  }, BUY_POLL_MS);
}