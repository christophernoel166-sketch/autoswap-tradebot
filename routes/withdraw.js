// routes/withdraw.js
import express from "express";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import { processWithdrawal } from "../src/withdraw/processWithdrawal.js";

const router = express.Router();

const MIN_WITHDRAW_SOL = 0.002; // minimum request
const WITHDRAW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * ===================================================
 * 💸 NON-CUSTODIAL WITHDRAW
 * ===================================================
 */
router.post("/withdraw", async (req, res) => {
  try {
    const { walletAddress, amountSol } = req.body;

    if (!walletAddress || !amountSol || amountSol <= 0) {
      return res.status(400).json({ error: "invalid_parameters" });
    }

    if (amountSol < MIN_WITHDRAW_SOL) {
      return res.status(400).json({
        error: "below_min_withdraw",
        min: MIN_WITHDRAW_SOL,
      });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (!user.tradingWalletPublicKey) {
      return res.status(400).json({ error: "trading_wallet_missing" });
    }

    // --------------------------------------------------
    // ⏱️ COOLDOWN CHECK
    // --------------------------------------------------
    const lastWithdrawal = await Withdrawal.findOne({
      walletAddress,
      status: { $in: ["pending", "sent"] },
    }).sort({ createdAt: -1 });

    if (lastWithdrawal) {
      const elapsed =
        Date.now() - new Date(lastWithdrawal.createdAt).getTime();

      if (elapsed < WITHDRAW_COOLDOWN_MS) {
        return res.status(429).json({
          error: "withdraw_cooldown",
          retryAfterSeconds: Math.ceil(
            (WITHDRAW_COOLDOWN_MS - elapsed) / 1000
          ),
        });
      }
    }

    // --------------------------------------------------
    // 🧾 CREATE WITHDRAWAL RECORD
    // --------------------------------------------------
    const withdrawal = await Withdrawal.create({
      walletAddress,
      amountSol,
      status: "pending",
      createdAt: new Date(),
    });

    // --------------------------------------------------
    // 🚀 EXECUTE WITHDRAWAL
    // --------------------------------------------------
    const result = await processWithdrawal(withdrawal._id);

    return res.json({
      ok: true,
      requested: amountSol,
      fee: result.feeChargedSol,
      received: result.sentAmountSol,
      txSignature: result.txSignature,
    });

  } catch (err) {
    console.error("withdraw error:", err);
    return res.status(500).json({ error: "withdraw_failed" });
  }
});

export default router;
