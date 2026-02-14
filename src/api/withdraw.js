import express from "express";
import User from "../../models/User.js";
import Withdrawal from "../../models/Withdrawal.js";
import { processWithdrawal } from "../withdraw/processWithdrawal.js";

const router = express.Router();

const MIN_WITHDRAW_SOL = 0.002;
const WITHDRAW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// 💸 FEE CONFIG
const WITHDRAW_FEE_PERCENT = 1;     // 1%
const WITHDRAW_FEE_MIN_SOL = 0.005; // minimum fee

router.post("/withdraw", async (req, res) => {
  try {
    const { walletAddress, amountSol } = req.body;

    if (!walletAddress || !amountSol) {
      return res.status(400).json({ error: "missing_parameters" });
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
    // 💰 BALANCE CHECK
    // --------------------------------------------------
    if (user.balanceSol < amountSol) {
      return res.status(400).json({
        error: "insufficient_balance",
        balance: user.balanceSol,
      });
    }

    // --------------------------------------------------
    // 💸 CALCULATE FEE
    // --------------------------------------------------
    const feeByPercent = (amountSol * WITHDRAW_FEE_PERCENT) / 100;
    const feeSol = Math.max(feeByPercent, WITHDRAW_FEE_MIN_SOL);
    const netAmountSol = Number((amountSol - feeSol).toFixed(6));

    if (netAmountSol <= 0) {
      return res.status(400).json({
        error: "withdraw_amount_too_small_after_fee",
      });
    }

    // --------------------------------------------------
    // 🔒 LOCK FUNDS (FULL amount incl. fee)
    // --------------------------------------------------
    await User.updateOne(
      {
        walletAddress,
        balanceSol: { $gte: amountSol },
      },
      {
        $inc: {
          balanceSol: -amountSol,
          lockedBalanceSol: amountSol,
        },
      }
    );

    // --------------------------------------------------
    // 🧾 CREATE WITHDRAWAL RECORD
    // --------------------------------------------------
    const withdrawal = await Withdrawal.create({
      walletAddress,
      amountSol,
      feeSol,
      netAmountSol,
      status: "pending",
    });

    // --------------------------------------------------
    // 🚀 EXECUTE WITHDRAWAL (NET amount only)
    // --------------------------------------------------
    const result = await processWithdrawal(withdrawal._id);

    return res.json({
      ok: true,
      requested: amountSol,
      fee: feeSol,
      received: netAmountSol,
      txSignature: result.txSignature,
    });
  } catch (err) {
    console.error("withdraw api error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
