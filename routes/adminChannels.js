import express from "express";
import SignalChannel from "../models/SignalChannel.js";

const router = express.Router();

/**
 * GET /api/admin/channels
 * List all allowed channels
 */
router.get("/channels", async (req, res) => {
  const channels = await SignalChannel.find().sort({ createdAt: -1 });
  res.json({ channels });
});

/**
 * POST /api/admin/channels
 * Add a new signal channel
 */
router.post("/channels", async (req, res) => {
  const { channelId, username, name } = req.body;

  if (!channelId) {
    return res.status(400).json({ error: "channelId required" });
  }

  const exists = await SignalChannel.findOne({ channelId });
  if (exists) {
    return res.status(409).json({ error: "Channel already exists" });
  }

  const channel = await SignalChannel.create({
    channelId,
    username,
    name,
  });

  res.json({ ok: true, channel });
});

/**
 * DELETE /api/admin/channels/:id
 */
router.delete("/channels/:id", async (req, res) => {
  await SignalChannel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
