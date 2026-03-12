import User from "../../models/User.js";
import { popSellJob } from "../queue/tradeQueue.js";

const SELL_CONCURRENCY = Number(process.env.SELL_CONCURRENCY || 10);

let activeSells = 0;

/**
 * Inject the actual sell executor from the main bot file
 */
let executeUserSellHandler = null;

export function registerSellExecutor(fn) {
  executeUserSellHandler = fn;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function runSellWorkerLoop() {
  while (true) {
    try {
      // Respect concurrency cap
      if (activeSells >= SELL_CONCURRENCY) {
        await sleep(100);
        continue;
      }

      // Blocking pop: waits until a job exists
      const job = await popSellJob();
      if (!job) {
        // Avoid tight loop if Redis returned null unexpectedly
        await sleep(100);
        continue;
      }

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
    } catch (err) {
      console.error("❌ Sell worker loop failed:", err?.message || err);
      await sleep(500);
    }
  }
}

export function startSellWorker() {
  console.log(`🚀 Sell worker started (concurrency=${SELL_CONCURRENCY})`);
  runSellWorkerLoop().catch((err) => {
    console.error("❌ Sell worker crashed:", err?.message || err);
  });
}