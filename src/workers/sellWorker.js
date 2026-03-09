import User from "../../models/User.js";
import { popSellJob } from "../queue/tradeQueue.js";

const SELL_CONCURRENCY = Number(process.env.SELL_CONCURRENCY || 10);
const SELL_POLL_MS = Number(process.env.SELL_POLL_MS || 500);

let activeSells = 0;

/**
 * Inject the actual sell executor from the main bot file
 */
let executeUserSellHandler = null;

export function registerSellExecutor(fn) {
  executeUserSellHandler = fn;
}

async function processOneSellJob(job) {
  const { walletAddress, mint, reason, percent } = job || {};

  if (!walletAddress || !mint) {
    console.warn("⚠️ Invalid sell job:", job);
    return;
  }

  const user = await User.findOne({ walletAddress }).lean();
  if (!user) {
    console.warn("⚠️ Sell job skipped — user not found:", walletAddress);
    return;
  }

  if (typeof executeUserSellHandler !== "function") {
    console.warn("⚠️ Sell executor not registered");
    return;
  }

  await executeUserSellHandler({
    walletAddress,
    mint,
    reason: reason || "sell",
    percent: Number(percent || 100),
    user,
  });
}

async function tickSellWorker() {
  while (activeSells < SELL_CONCURRENCY) {
    const job = await popSellJob();
    if (!job) break;

    activeSells++;

    processOneSellJob(job)
      .catch((err) => {
        console.error("❌ Sell worker job failed:", {
          err: err?.message || err,
          job,
        });
      })
      .finally(() => {
        activeSells--;
      });
  }
}

export function startSellWorker() {
  console.log(`🚀 Sell worker started (concurrency=${SELL_CONCURRENCY})`);

  setInterval(() => {
    tickSellWorker().catch((err) => {
      console.error("❌ Sell worker tick failed:", err?.message || err);
    });
  }, SELL_POLL_MS);
}