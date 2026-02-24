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

const FEE_WALLET = process.env.FEE_WALLET;
if (!FEE_WALLET) throw new Error("FEE_WALLET missing");

const connection = new Connection(RPC_URL, "confirmed");

// 🔐 Encryption secret (same one used in walletService)
const ENCRYPTION_SECRET = process.env.WALLET_ENCRYPTION_KEY;
if (!ENCRYPTION_SECRET) throw new Error("WALLET_ENCRYPTION_KEY missing");

const round6 = (n) => Number(Number(n).toFixed(6));

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

  const walletAddress = String(withdrawal.walletAddress || "").trim();
  const amountSol = Number(withdrawal.amountSol);

  if (!walletAddress || !Number.isFinite(amountSol) || amountSol <= 0) {
    withdrawal.status = "failed";
    withdrawal.error = "invalid_withdrawal_record";
    withdrawal.failedAt = new Date();
    await withdrawal.save();
    throw new Error("invalid_withdrawal_record");
  }

  // --------------------------------------------------
  // 2️⃣ Load user
  // --------------------------------------------------
  const user = await User.findOne({ walletAddress });
  if (!user) {
    withdrawal.status = "failed";
    withdrawal.error = "user_not_found";
    withdrawal.failedAt = new Date();
    await withdrawal.save();
    throw new Error("user_not_found");
  }

  if (!user.tradingWalletEncryptedPrivateKey || !user.tradingWalletIv) {
    withdrawal.status = "failed";
    withdrawal.error = "trading_wallet_missing";
    withdrawal.failedAt = new Date();
    await withdrawal.save();
    throw new Error("trading_wallet_missing");
  }

  // --------------------------------------------------
  // 3️⃣ Resolve fee + net (prefer stored fields if present)
  // --------------------------------------------------
  const feeSol =
    Number.isFinite(Number(withdrawal.feeSol)) && Number(withdrawal.feeSol) > 0
      ? Number(withdrawal.feeSol)
      : WITHDRAW_FEE_SOL;

  const netAmountSol =
    Number.isFinite(Number(withdrawal.netAmountSol)) &&
    Number(withdrawal.netAmountSol) > 0
      ? Number(withdrawal.netAmountSol)
      : round6(amountSol - feeSol);

  if (netAmountSol <= 0 || amountSol <= feeSol) {
    withdrawal.status = "failed";
    withdrawal.error = "withdraw_amount_too_small_after_fee";
    withdrawal.failedAt = new Date();
    withdrawal.feeSol = round6(feeSol);
    withdrawal.netAmountSol = round6(Math.max(0, netAmountSol));
    await withdrawal.save();
    throw new Error("withdraw_amount_too_small_after_fee");
  }

  const lamportsToUser = Math.floor(netAmountSol * LAMPORTS_PER_SOL);
  const lamportsFee = Math.floor(feeSol * LAMPORTS_PER_SOL);

  // --------------------------------------------------
  // 4️⃣ Restore trading wallet
  // --------------------------------------------------
  const tradingWallet = restoreTradingWallet(user);

  // --------------------------------------------------
  // 5️⃣ Check on-chain balance (must cover net + fee + tx fees buffer)
  // --------------------------------------------------
  const currentLamports = await connection.getBalance(tradingWallet.publicKey);

  // small buffer for tx fee
  const TX_FEE_BUFFER = 10_000; // ~0.00001 SOL safety
  const requiredLamports = lamportsToUser + lamportsFee + TX_FEE_BUFFER;

  if (currentLamports < requiredLamports) {
    withdrawal.status = "failed";
    withdrawal.error = "insufficient_onchain_balance";
    withdrawal.failedAt = new Date();
    withdrawal.feeSol = round6(feeSol);
    withdrawal.netAmountSol = round6(netAmountSol);
    await withdrawal.save();
    throw new Error("insufficient_onchain_balance");
  }

  const toPubkey = new PublicKey(walletAddress);
  const feePubkey = new PublicKey(FEE_WALLET);

  // --------------------------------------------------
  // 6️⃣ Build transaction (net to user + fee to fee wallet)
  // --------------------------------------------------
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: tradingWallet.publicKey,
      toPubkey,
      lamports: lamportsToUser,
    }),
    SystemProgram.transfer({
      fromPubkey: tradingWallet.publicKey,
      toPubkey: feePubkey,
      lamports: lamportsFee,
    })
  );

  try {
    // --------------------------------------------------
    // 7️⃣ Send transaction
    // --------------------------------------------------
    const signature = await connection.sendTransaction(tx, [tradingWallet], {
      skipPreflight: false,
    });

    await connection.confirmTransaction(signature, "confirmed");

    // --------------------------------------------------
    // 8️⃣ Mark withdrawal as sent
    // --------------------------------------------------
    withdrawal.status = "sent";
    withdrawal.txSignature = signature;
    withdrawal.sentAt = new Date();
    withdrawal.feeSol = round6(feeSol);
    withdrawal.netAmountSol = round6(netAmountSol);
    await withdrawal.save();

    // --------------------------------------------------
    // 9️⃣ Record withdrawal fee ledger (now matches on-chain fee)
    // --------------------------------------------------
    await FeeLedger.create({
      type: "withdrawal_fee",
      amountSol: round6(feeSol),
      walletAddress,
      withdrawalId: withdrawal._id,
      status: "recorded",
      createdAt: new Date(),
      txSignature: signature,
    });

    return {
      ok: true,
      txSignature: signature,
      feeChargedSol: round6(feeSol),
      sentAmountSol: round6(netAmountSol),
    };
  } catch (err) {
    console.error("❌ Withdrawal failed:", err);

    withdrawal.status = "failed";
    withdrawal.error = err?.message || "withdraw_failed";
    withdrawal.failedAt = new Date();
    withdrawal.feeSol = round6(feeSol);
    withdrawal.netAmountSol = round6(netAmountSol);
    await withdrawal.save();

    throw err;
  }
}