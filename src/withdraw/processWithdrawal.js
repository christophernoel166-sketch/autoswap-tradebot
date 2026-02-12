// src/withdraw/processWithdrawal.js
import {
  Connection,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";

import User from "../../models/User.js";
import Withdrawal from "../../models/Withdrawal.js";
import FeeLedger from "../../models/FeeLedger.js";


const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) throw new Error("RPC_URL missing");

const connection = new Connection(RPC_URL, "confirmed");

const WITHDRAW_FEE_SOL = 0.002;

/**
 * Execute a pending withdrawal on-chain
 */
export async function processWithdrawal(withdrawalId) {
  const withdrawal = await Withdrawal.findOne({
    _id: withdrawalId,
    status: "pending",
  });

  if (!withdrawal) {
    throw new Error("withdrawal_not_pending");
  }

  const { walletAddress, amountSol } = withdrawal;

  const toPubkey = new PublicKey(walletAddress);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  // --------------------------------------------------
  // 1️⃣ Build transaction (USER RECEIVES ONLY amountSol)
  // --------------------------------------------------
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: INTERNAL_TRADING_WALLET.publicKey,
      toPubkey,
      lamports,
    })
  );

  try {
    // --------------------------------------------------
    // 2️⃣ Send transaction
    // --------------------------------------------------
    const signature = await connection.sendTransaction(
      tx,
      [INTERNAL_TRADING_WALLET],
      { skipPreflight: false }
    );

    await connection.confirmTransaction(signature, "confirmed");

    // --------------------------------------------------
    // 3️⃣ Mark withdrawal as SENT
    // --------------------------------------------------
    withdrawal.status = "sent";
    withdrawal.txSignature = signature;
    withdrawal.sentAt = new Date();
    await withdrawal.save();

    // --------------------------------------------------
    // 4️⃣ Release locked funds (amount + fee)
    // --------------------------------------------------
    await User.updateOne(
      { walletAddress },
      {
        $inc: {
          lockedBalanceSol: -(amountSol + WITHDRAW_FEE_SOL),
        },
      }
    );

    // --------------------------------------------------
    // 5️⃣ Record withdrawal fee (STEP 2.6.6.2 ✅)
    // --------------------------------------------------
    await FeeLedger.create({
      type: "withdrawal_fee",
      amountSol: WITHDRAW_FEE_SOL,
      walletAddress,
      withdrawalId: withdrawal._id,
      status: "recorded",
      createdAt: new Date(),
    });

    return {
      ok: true,
      txSignature: signature,
      feeChargedSol: WITHDRAW_FEE_SOL,
    };
  } catch (err) {
    console.error("❌ Withdrawal send failed:", err);

    // --------------------------------------------------
    // 🔁 ROLLBACK FUNDS (amount + fee)
    // --------------------------------------------------
    await User.updateOne(
      { walletAddress },
      {
        $inc: {
          balanceSol: amountSol + WITHDRAW_FEE_SOL,
          lockedBalanceSol: -(amountSol + WITHDRAW_FEE_SOL),
        },
      }
    );

    withdrawal.status = "failed";
    withdrawal.error = err.message;
    withdrawal.failedAt = new Date();
    await withdrawal.save();

    throw err;
  }
}
