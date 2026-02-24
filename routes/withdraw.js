// routes/withdraw.js
import express from "express";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import { processWithdrawal } from "../src/withdraw/processWithdrawal.js";

const router = express.Router();

const MIN_WITHDRAW_SOL = 0.002; // minimum request
const WITHDRAW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// ✅ PLATFORM WITHDRAW FEE (flat)
const WITHDRAW_FEE_SOL = 0.005;

const round6 = (n) => Number(Number(n).toFixed(6));

/**
 * ===================================================
 * 💸 NON-CUSTODIAL WITHDRAW
 * Fee: flat 0.005 SOL per withdrawal
 * ===================================================
 */
router.post("/withdraw", async (req, res) => {
  try {
    const walletAddress = String(req.body.walletAddress || "").trim();
    const amountSolNum = Number(req.body.amountSol);

    if (!walletAddress || !Number.isFinite(amountSolNum) || amountSolNum <= 0) {
      return res.status(400).json({ error: "invalid_parameters" });
    }

    if (amountSolNum < MIN_WITHDRAW_SOL) {
      return res.status(400).json({
        error: "below_min_withdraw",
        min: MIN_WITHDRAW_SOL,
      });
    }

    // ✅ calculate fee + net
    const feeSol = WITHDRAW_FEE_SOL;
    const netAmountSol = round6(amountSolNum - feeSol);

    if (netAmountSol <= 0) {
      return res.status(400).json({
        error: "withdraw_amount_too_small_after_fee",
        fee: feeSol,
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
      const elapsed = Date.now() - new Date(lastWithdrawal.createdAt).getTime();

      if (elapsed < WITHDRAW_COOLDOWN_MS) {
        return res.status(429).json({
          error: "withdraw_cooldown",
          retryAfterSeconds: Math.ceil((WITHDRAW_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    // --------------------------------------------------
    // 🧾 CREATE WITHDRAWAL RECORD (store fee + net)
    // --------------------------------------------------
    const withdrawal = await Withdrawal.create({
      walletAddress,
      amountSol: round6(amountSolNum),  // requested total
      feeSol: round6(feeSol),           // flat platform fee
      netAmountSol,                     // what user receives
      status: "pending",
      createdAt: new Date(),
    });

    // --------------------------------------------------
    // 🚀 EXECUTE WITHDRAWAL
    // IMPORTANT: processWithdrawal should send `netAmountSol`
    // and (separately) route fee to FEE_WALLET if you want.
    // --------------------------------------------------
    const result = await processWithdrawal(withdrawal._id);

    return res.json({
      ok: true,
      requested: round6(amountSolNum),
      fee: round6(feeSol),
      received: netAmountSol,
      txSignature: result?.txSignature || null,
    });
  } catch (err) {
    console.error("withdraw error:", err);
    return res.status(500).json({ error: "withdraw_failed" });
  }
});

export default router;