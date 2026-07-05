import express from "express";
import { enqueueTelegramNotification } from "../services/telegramQueueService.js";

const router = express.Router();

// =====================================================
// TEST TELEGRAM QUEUE
// POST /api/test/telegram
// =====================================================

router.post("/telegram", async (req, res) => {

  try {

    const {
      telegramUserId,
      message,
    } = req.body;

    if (!telegramUserId) {

      return res.status(400).json({
        ok: false,
        error: "telegramUserId is required",
      });

    }

    await enqueueTelegramNotification({

      telegramUserId,

      message:
        message ||
        "🚀 Autoswaps Queue Test Successful!",

      parseMode: "HTML",

    });

    return res.json({

      ok: true,

      queued: true,

      telegramUserId,

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      ok: false,

      error: err.message,

    });

  }

});

export default router;