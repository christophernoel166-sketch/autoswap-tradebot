import {
  dequeueTelegramNotification,
} from "./telegramQueueService.js";

const LOG = console;


let running = false;

// =====================================================
// PROCESS ONE QUEUE ITEM
// =====================================================

async function processQueue(bot) {

  console.log(
    "🔎 [TelegramQueue] processQueue() checking for job..."
  );

  const job =
    await dequeueTelegramNotification();


console.log(
  "🚨 [TelegramQueueWorker] JOB RECEIVED:",
  job
);


  console.log(
    "🔎 [TelegramQueue] dequeue result:",
    job
      ? {
          telegramUserId: job.telegramUserId,
          telegramChannelId: job.telegramChannelId,
          hasMessage: Boolean(job.message),
        }
      : "NO JOB"
  );

  if (!job) {
    return;
  }

  try {

    const destination =
      job.telegramChannelId ||
      job.telegramUserId;

    console.log(
      "🔎 [TelegramQueue] Preparing Telegram send:",
      {
        destination,
        hasMessage: Boolean(job.message),
      }
    );

    if (!destination) {
      LOG.error(
        "Telegram notification skipped: no destination"
      );
      return;
    }

    await bot.telegram.sendMessage(
      destination,
      job.message,
      {
        parse_mode:
          job.parseMode || "HTML",
      }
    );

    LOG.info(
      `📨 Telegram notification sent to ${destination}`
    );

  } catch (err) {

    LOG.error(
      "Telegram notification failed:",
      err.message
    );

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

  (async () => {

    while (running) {

      try {

        await processQueue(bot);

      } catch (err) {

        LOG.error(
          "❌ Telegram Queue Worker error:",
          err
        );

      }

    }

  })();

}