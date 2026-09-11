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
  // Preserve all fields that were carried by the queued job.
  // This is important because the queue intentionally transports
  // the complete job object.
  ...job,

  // Worker-authoritative fields
  requestId:
    job?.requestId ||
    `${walletAddress}:${mint}:${Date.now()}`,

  action: "BUY",

  // Always use the freshly loaded authoritative user record.
  user,

  walletAddress: user.walletAddress,

  // Preserve an explicitly supplied wallet if one exists.
  // Otherwise the main trade executor can resolve it as before.
  wallet: job?.wallet ?? null,

  mint,

  sourceChannel:
    job?.sourceChannel ??
    channelId,

  percent:
    job?.percent ??
    100,

  reason:
    job?.reason ??
    "SIGNAL_APPROVED",

  slippageBps:
    job?.slippageBps ??
    null,

  metadata: {
    ...(job?.metadata || {}),

    source: "BUY_WORKER",
    worker: "BUY_WORKER",
    queue: "BUY_QUEUE",

    receivedAt: new Date(),

    signalSource:
      job?.signalSource ??
      channelId,

    aiReviewed:
      job?.metadata?.aiReviewed ??
      false,
  },
};

console.info("🧠 Submitting trade request", {
  requestId: tradeRequest.requestId,
  walletAddress,
  mint,
  sourceChannel: tradeRequest.sourceChannel,
  source: "BUY_WORKER",

  // Diagnostic only — lets us verify that AI/scanner
  // information survived the queue → worker boundary.
  hasAIContext: Boolean(
    tradeRequest.aiContext ||
    tradeRequest.entryContext ||
    tradeRequest.scannerContext ||
    tradeRequest.entrySnapshot
  ),
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