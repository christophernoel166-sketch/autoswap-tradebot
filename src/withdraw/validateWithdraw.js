// src/withdraw/validateWithdraw.js
import User from "../../models/User.js";
import Withdrawal from "../../models/Withdrawal.js";

// ===================================================
// ⚙️ WITHDRAW CONFIG
// ===================================================
export const MIN_WITHDRAW_SOL = 0.002;
export const WITHDRAW_FEE_SOL = 0.002;

/**
 * Validate a withdrawal request
 * Throws Error if invalid
 */
export async function validateWithdraw({
  walletAddress,
  amountSol, // amount user wants to RECEIVE
}) {
  // --------------------------------------------------
  // 1️⃣ Basic checks
  // --------------------------------------------------
  if (!walletAddress) {
    throw new Error("wallet_missing");
  }

  if (!amountSol || amountSol <= 0) {
    throw new Error("invalid_amount");
  }

  if (amountSol < MIN_WITHDRAW_SOL) {
    throw new Error("below_min_withdraw");
  }

  // --------------------------------------------------
  // 2️⃣ Load user
  // --------------------------------------------------
  const user = await User.findOne({ walletAddress });

  if (!user) {
    throw new Error("user_not_found");
  }

  // --------------------------------------------------
  // 3️⃣ Pending withdrawal guard
  // --------------------------------------------------
  const pending = await Withdrawal.findOne({
    walletAddress,
    status: "pending",
  });

  if (pending) {
    throw new Error("withdraw_pending");
  }

  // --------------------------------------------------
  // 4️⃣ Balance check (AVAILABLE ONLY)
  // --------------------------------------------------
  const available = Number(user.balanceSol || 0);

  // User must cover: amount + fee
  const totalDebit = amountSol + WITHDRAW_FEE_SOL;

  if (available < totalDebit) {
    throw new Error("insufficient_balance");
  }

  // --------------------------------------------------
  // ✅ VALID
  // --------------------------------------------------
  return {
    walletAddress,
    user,
    amountSol,                // what user receives
    feeSol: WITHDRAW_FEE_SOL,  // fixed fee
    totalDebit,               // deducted from balance
    availableBalance: available,
  };
}
