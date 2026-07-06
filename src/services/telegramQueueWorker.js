export function startTelegramQueueWorker(bot) {

  console.log("① startTelegramQueueWorker() entered");

  if (!bot) {
    console.log("② bot is missing");
    throw new Error("Telegram bot instance is required.");
  }

  console.log("③ bot exists");

  if (running) {
    console.log("④ worker already running");
    return;
  }

  console.log("⑤ setting running=true");

  running = true;

  console.log("⑥ starting worker");

  processQueue(bot).catch((err) => {
    console.error("processQueue error:", err);
  });

  console.log("⑦ processQueue kicked off");

  setInterval(async () => {
    try {
      await processQueue(bot);
    } catch (err) {
      console.error(err);
    }
  }, POLL_INTERVAL_MS);

  console.log("⑧ worker initialized");
}