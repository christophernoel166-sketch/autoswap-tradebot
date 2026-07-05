import {
  dequeueTelegramNotification,
} from "./telegramQueueService.js";

const LOG = console;

const POLL_INTERVAL_MS = 1000;

let running = false;

// =====================================================
// PROCESS ONE QUEUE ITEM
// =====================================================

async function processQueue(bot) {

  const job =
    await dequeueTelegramNotification();

  if (!job) {
    return;
  }

  try {

    await bot.telegram.sendMessage(
      job.telegramUserId,
      job.message,
      {
        parse_mode:
          job.parseMode || "HTML",
      }
    );

    LOG.info(
      `📨 Telegram notification sent to ${job.telegramUserId}`
    );

  } catch (err) {

    LOG.error(
      "Telegram notification failed:",
      err.message
    );

    // Future:
    // Retry / Dead-letter queue

  }

}

// =====================================================
// START WORKER
// =====================================================

export function startTelegramQueueWorker(
  bot
) {

  if (!bot) {
    throw new Error(
      "Telegram bot instance is required."
    );
  }

  if (running) {
    return;
  }

  running = true;

  LOG.info(
    "🚀 Telegram Queue Worker started."
  );

  processQueue(bot).catch(console.error);

  setInterval(async () => {

    try {

      await processQueue(bot);

    } catch (err) {

      LOG.error(err);

    }

  }, POLL_INTERVAL_MS);

}