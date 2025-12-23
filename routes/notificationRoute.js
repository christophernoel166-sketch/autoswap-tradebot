import express from "express";
import Notification from "../models/Notification.js";

const router = express.Router();

// GET all notifications
router.get("/", async (req, res) => {
  try {
    const list = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ ok: true, notifications: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Mark as read
router.post("/read/:id", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
