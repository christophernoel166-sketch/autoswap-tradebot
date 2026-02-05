// routes/withdraw.js
import express from "express";
import User from "../models/User.js";
import { PublicKey } from "@solana/web3.js";
import { sendSolToUser } from "../src/solana/sendSol.js";

const router = express.Router();

/**
 * ===================================================
 * 💸 WITHDRAW SOL (AUTOSNIPE-STYLE)
 * ===================================================
 */
router.post("/withdraw", async (req, res) => {
  try {
    const { walletAddress, amountSol } = req.body;

    if (!walletAddress || !amountSol || amountSol <= 0) {
      return res.status(400).json({ error: "invalid_parameters" });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // ❌ Cannot withdraw locked funds
    if (user.balanceSol < amountSol) {
      return res.status(400).json({
        error: "insufficient_balance",
        balanceSol: user.balanceSol,
      });
    }

    // ---------------------------------------------------
    // 🔐 ATOMIC BALANCE DEDUCTION
    // ---------------------------------------------------
    const result = await User.updateOne(
      {
        walletAddress,
        balanceSol: { $gte: amountSol },
      },
      {
        $inc: { balanceSol: -amountSol },
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(409).json({ error: "balance_race_condition" });
    }

    // ---------------------------------------------------
    // 🚀 SEND SOL FROM INTERNAL WALLET
    // ---------------------------------------------------
    let txid;
    try {
      txid = await sendSolToUser({
        to: new PublicKey(walletAddress),
        amountSol,
      });
    } catch (err) {
      // 🔁 ROLLBACK ON FAILURE
      await User.updateOne(
        { walletAddress },
        { $inc: { balanceSol: amountSol } }
      );

      throw err;
    }

    return res.json({
      ok: true,
      txid,
      withdrawnSol: amountSol,
    });
  } catch (err) {
    console.error("withdraw error:", err);
    return res.status(500).json({ error: "withdraw_failed" });
  }
});

export default router;
