import User from "../../models/User.js";
import { popBuyJob } from "../queue/tradeQueue.js";

const BUY_CONCURRENCY = Number(process.env.BUY_CONCURRENCY || 5);

let activeBuys = 0;

/**
 * Inject the actual trade executor from your main bot file
 * so this worker stays reusable.
 */
let executeUserTradeHandler = null;

export function registerBuyExecutor(fn) {
  executeUserTradeHandler = fn;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function runBuyWorkerLoop() {
  while (true) {
    try {
      // Respect concurrency cap
      if (activeBuys >= BUY_CONCURRENCY) {
        await sleep(100);
        continue;
      }

      // Blocking pop: waits until a job exists
      const job = await popBuyJob();
      if (!job) {
        // If Redis returned null for some reason, avoid tight loop
        await sleep(100);
        continue;
      }

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
    } catch (err) {
      console.error("❌ Buy worker loop failed:", err?.message || err);
      await sleep(500);
    }
  }
}

export function startBuyWorker() {
  console.log(`🚀 Buy worker started (concurrency=${BUY_CONCURRENCY})`);
  runBuyWorkerLoop().catch((err) => {
    console.error("❌ Buy worker crashed:", err?.message || err);
  });
}