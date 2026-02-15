// src/withdraw/processWithdrawal.js

import {
  Connection,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
} from "@solana/web3.js";

import crypto from "crypto";
import User from "../../models/User.js";
import Withdrawal from "../../models/Withdrawal.js";
import FeeLedger from "../../models/FeeLedger.js";
import { WITHDRAW_FEE_SOL } from "../config/fees.js";

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) throw new Error("RPC_URL missing");

const connection = new Connection(RPC_URL, "confirmed");

// 🔒 FIXED WITHDRAWAL FEE (Single Source of Truth)
      

// 🔐 Encryption secret (same one used in walletService)
const ENCRYPTION_SECRET = process.env.WALLET_ENCRYPTION_SECRET;
if (!ENCRYPTION_SECRET) throw new Error("WALLET_ENCRYPTION_SECRET missing");

/**
 * 🔓 Decrypt trading wallet private key
 */
function decryptPrivateKey(encryptedHex, ivHex) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_SECRET, "hex"),
    Buffer.from(ivHex, "hex")
  );

  let decrypted = decipher.update(encryptedHex, "hex", "hex");
  decrypted += decipher.final("hex");
  return decrypted;
}

/**
 * 🔁 Restore Keypair from encrypted DB fields
 */
function restoreTradingWallet(user) {
  const decrypted = decryptPrivateKey(
    user.tradingWalletEncryptedPrivateKey,
    user.tradingWalletIv
  );

  return Keypair.fromSecretKey(Buffer.from(decrypted, "hex"));
}

/**
 * 🚀 Execute a pending withdrawal
 */
export async function processWithdrawal(withdrawalId) {
  // --------------------------------------------------
  // 1️⃣ Load pending withdrawal
  // --------------------------------------------------
  const withdrawal = await Withdrawal.findOne({
    _id: withdrawalId,
    status: "pending",
  });

  if (!withdrawal) {
    throw new Error("withdrawal_not_pending");
  }

  const { walletAddress, amountSol } = withdrawal;

  // --------------------------------------------------
  // 2️⃣ Load user
  // --------------------------------------------------
  const user = await User.findOne({ walletAddress });
  if (!user) {
    throw new Error("user_not_found");
  }

  if (
    !user.tradingWalletEncryptedPrivateKey ||
    !user.tradingWalletIv
  ) {
    throw new Error("trading_wallet_missing");
  }

  // --------------------------------------------------
  // 3️⃣ Validate withdrawal amount
  // --------------------------------------------------
  if (amountSol <= WITHDRAW_FEE_SOL) {
    withdrawal.status = "failed";
    withdrawal.error = "withdraw_amount_too_small_after_fee";
    withdrawal.failedAt = new Date();
    await withdrawal.save();
    throw new Error("withdraw_amount_too_small_after_fee");
  }

  const netAmountSol = Number(
    (amountSol - WITHDRAW_FEE_SOL).toFixed(6)
  );

  const lamportsToSend = Math.floor(
    netAmountSol * LAMPORTS_PER_SOL
  );

  // --------------------------------------------------
  // 4️⃣ Restore trading wallet
  // --------------------------------------------------
  const tradingWallet = restoreTradingWallet(user);

  // --------------------------------------------------
  // 5️⃣ Check on-chain balance
  // --------------------------------------------------
  const currentLamports = await connection.getBalance(
    tradingWallet.publicKey
  );

  if (currentLamports < lamportsToSend) {
    withdrawal.status = "failed";
    withdrawal.error = "insufficient_onchain_balance";
    withdrawal.failedAt = new Date();
    await withdrawal.save();
    throw new Error("insufficient_onchain_balance");
  }

  const toPubkey = new PublicKey(walletAddress);

  // --------------------------------------------------
  // 6️⃣ Build transaction
  // --------------------------------------------------
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: tradingWallet.publicKey,
      toPubkey,
      lamports: lamportsToSend,
    })
  );

  try {
    // --------------------------------------------------
    // 7️⃣ Send transaction
    // --------------------------------------------------
    const signature = await connection.sendTransaction(
      tx,
      [tradingWallet],
      { skipPreflight: false }
    );

    await connection.confirmTransaction(signature, "confirmed");

    // --------------------------------------------------
    // 8️⃣ Mark withdrawal as sent
    // --------------------------------------------------
    withdrawal.status = "sent";
    withdrawal.txSignature = signature;
    withdrawal.sentAt = new Date();
    await withdrawal.save();

    // --------------------------------------------------
    // 9️⃣ Record fixed withdrawal fee
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
      sentAmountSol: netAmountSol,
    };

  } catch (err) {
    console.error("❌ Withdrawal failed:", err);

    withdrawal.status = "failed";
    withdrawal.error = err.message;
    withdrawal.failedAt = new Date();
    await withdrawal.save();

    throw err;
  }
}
