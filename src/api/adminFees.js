// src/api/adminFees.js
import express from "express";

import { requireAdmin } from "../middleware/requireAdmin.js";
import { executeFeeWithdrawal } from "../admin/executeFeeWithdrawal.js";
import { getFeeSummary } from "../admin/getFeeSummary.js";
import { getFeeHistory } from "../admin/getFeeHistory.js";

const router = express.Router();

/**
 * ===================================================
 * 💰 ADMIN — VIEW FEE SUMMARY
 * GET /api/admin/fees/summary
 * ===================================================
 */
router.get("/fees/summary", requireAdmin, async (_req, res) => {
  try {
    const summary = await getFeeSummary();
    return res.json(summary);
  } catch (err) {
    console.error("❌ Fee summary failed:", err);
    return res.status(500).json({
      error: "fee_summary_failed",
      message: err.message,
    });
  }
});

/**
 * ===================================================
 * 📜 ADMIN — VIEW FEE HISTORY
 * GET /api/admin/fees/history
 * ===================================================
 */
router.get("/fees/history", requireAdmin, async (_req, res) => {
  try {
    const history = await getFeeHistory();
    return res.json(history);
  } catch (err) {
    console.error("❌ Fee history failed:", err);
    return res.status(500).json({
      error: "fee_history_failed",
      message: err.message,
    });
  }
});

/**
 * ===================================================
 * 💸 ADMIN — WITHDRAW ACCUMULATED FEES
 * POST /api/admin/fees/withdraw
 * ===================================================
 */
router.post("/fees/withdraw", requireAdmin, async (_req, res) => {
  try {
    const result = await executeFeeWithdrawal();
    return res.json(result);
  } catch (err) {
    console.error("❌ Admin fee withdrawal failed:", err);
    return res.status(500).json({
      error: "fee_withdraw_failed",
      message: err.message,
    });
  }
});

export default router;
