import User from "../../models/User.js";
import { popBuyJob, releaseBuyLock } from "../queue/tradeQueue.js";

const BUY_CONCURRENCY = Number(process.env.BUY_CONCURRENCY || 5);

let activeBuys = 0;

/**
 * Inject the actual trade executor from your main bot file
 * so this worker stays reusable.
 */
let executeTradeHandler = null;

export function registerBuyExecutor(fn) {
  executeTradeHandler = fn;
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

  try {
    const user = await User.findOne({ walletAddress }).lean();
    if (!user) {
      console.warn("⚠️ Buy job skipped — user not found:", walletAddress);
      return;
    }

    if (typeof executeTradeHandler !== "function") {
    console.warn("⚠️ Trade executor not registered");
    return;
}

const tradeRequest = {
requestId: `${walletAddress}:${mint}:${Date.now()}`,
    action: "BUY",

    user,

    walletAddress: user.walletAddress,

    wallet: null,

    mint,

    sourceChannel: channelId,

    percent: 100,

    reason: "SIGNAL_APPROVED",

    slippageBps: null,

  metadata: {

    source: "BUY_WORKER",

    worker: "BUY_WORKER",

    queue: "BUY_QUEUE",

    receivedAt: new Date(),

    signalSource: channelId,

    aiReviewed: false,

}

};

console.info("🧠 Submitting trade request", {
  requestId: tradeRequest.requestId,
  walletAddress,
  mint,
  sourceChannel: channelId,
  source: "BUY_WORKER",
});

await executeTradeHandler(tradeRequest);

  } catch (err) {
    console.error("❌ Buy job execution failed:", err?.message || err);

  } finally {
    // 🔓 Always release the buy lock
    await releaseBuyLock(walletAddress, mint);
  }
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