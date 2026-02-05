// src/withdraw/createWithdrawal.js
import User from "../../models/User.js";
import Withdrawal from "../../models/Withdrawal.js";
import { WITHDRAW_FEE_SOL } from "./validateWithdraw.js";

/**
 * Create a pending withdrawal and lock funds atomically
 * amountSol = amount user will RECEIVE
 */
export async function createWithdrawal({
  walletAddress,
  amountSol,
}) {
  // --------------------------------------------------
  // 🧮 Calculate fee + total debit
  // --------------------------------------------------
  const feeSol = WITHDRAW_FEE_SOL; // 0.002 SOL
  const totalDebit = amountSol + feeSol;

  // --------------------------------------------------
  // 🔒 Atomically lock amount + fee
  // --------------------------------------------------
  const user = await User.findOneAndUpdate(
    {
      walletAddress,
      balanceSol: { $gte: totalDebit }, // atomic guard
    },
    {
      $inc: {
        balanceSol: -totalDebit,
        lockedBalanceSol: totalDebit,
      },
    },
    { new: true }
  );

  if (!user) {
    throw new Error("balance_changed_or_insufficient");
  }

  // --------------------------------------------------
  // 🧾 Create withdrawal record
  // --------------------------------------------------
  const withdrawal = await Withdrawal.create({
    walletAddress,
    amountSol,      // user receives this
    feeSol,         // platform fee
    totalDebit,     // locked amount
    status: "pending",
    createdAt: new Date(),
  });

  return {
    withdrawalId: withdrawal._id,
    walletAddress,
    amountSol,
    feeSol,
    totalDebit,
    balanceAfter: user.balanceSol,
  };
}
