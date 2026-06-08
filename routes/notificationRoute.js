import express from "express";
import UserNotification from "../models/UserNotification.js";

const router = express.Router();

/**
 * GET notifications for wallet
 */
router.get("/:walletAddress", async (req, res) => {
  try {
    const walletAddress =
      String(
        req.params.walletAddress || ""
      ).trim();

    if (!walletAddress) {
      return res.status(400).json({
        ok: false,
        error: "wallet_required",
      });
    }

    const notifications =
      await UserNotification.find({
        walletAddress,
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    return res.json({
      ok: true,
      notifications,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error:
        err?.message ||
        "internal_error",
    });
  }
});

/**
 * Mark notification read
 */
router.post(
  "/read/:id",
  async (req, res) => {
    try {
      await UserNotification.findByIdAndUpdate(
        req.params.id,
        {
          read: true,
        }
      );

      return res.json({
        ok: true,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error:
          err?.message ||
          "internal_error",
      });
    }
  }
);

export default router;