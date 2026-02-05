// src/solana/depositListener.js
import {
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { INTERNAL_TRADING_WALLET } from "../../solana/internalWallet.js";
import bs58 from "bs58";
import Deposit from "../../models/Deposit.js";
import User from "../../models/User.js";

// ===================================================
// 🔐 CUSTODY LIMITS
// ===================================================
const MAX_DEPOSIT_SOL = 50;

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
  throw new Error("RPC_URL missing");
}

const connection = new Connection(RPC_URL, "confirmed");

// Track last processed signature (memory only for now)
let lastSignature = null;

/* ===================================================
   🔍 HELPERS — STEP 2.2.7.1
=================================================== */

/**
 * Validate base58 Solana address
 */
function isValidSolanaAddress(addr) {
  try {
    const decoded = bs58.decode(addr);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Expected memo format:
 *   DEPOSIT:<WALLET_ADDRESS>
 */
function parseDepositMemo(memo) {
  if (!memo || typeof memo !== "string") return null;

  const trimmed = memo.trim();
  if (!trimmed.startsWith("DEPOSIT:")) return null;

  const wallet = trimmed.replace("DEPOSIT:", "").trim();
  if (!isValidSolanaAddress(wallet)) return null;

  return wallet;
}

/* ===================================================
   💰 POLL DEPOSITS — STEP 2.2.7.2 + 2.2.8
=================================================== */
export async function pollDeposits() {
  try {
    const internalPubkey = INTERNAL_TRADING_WALLET.publicKey;

    const signatures = await connection.getSignaturesForAddress(
      internalPubkey,
      { limit: 10 }
    );

    if (!signatures.length) return;

    for (const sigInfo of signatures) {
      if (sigInfo.signature === lastSignature) break;

      const tx = await connection.getParsedTransaction(
        sigInfo.signature,
        { maxSupportedTransactionVersion: 0 }
      );

      if (!tx || !tx.meta) continue;

      // ---------------------------------------------------
      // Extract memo (if present)
      // ---------------------------------------------------
      let memo = null;
      for (const ix of tx.transaction.message.instructions) {
        if (ix.program === "spl-memo") {
          memo = ix.parsed;
        }
      }

      const intendedWallet = parseDepositMemo(memo);

      // ---------------------------------------------------
      // Look for SOL transfer INTO internal wallet
      // ---------------------------------------------------
      for (const inst of tx.transaction.message.instructions) {
        if (inst.program !== "system") continue;

        const info = inst.parsed?.info;
        if (!info) continue;

        if (info.destination !== internalPubkey.toBase58()) continue;

        const fromWallet = info.source;
        const rawAmountSol =
          Number(info.lamports) / LAMPORTS_PER_SOL;

        const meta = {
          tx: sigInfo.signature,
          from: fromWallet,
          to: internalPubkey.toBase58(),
          rawAmountSol,
          memo,
          slot: tx.slot,
          time: new Date(
            (tx.blockTime || 0) * 1000
          ).toISOString(),
        };

        // ---------------------------------------------------
        // ❌ REJECT: no memo or invalid memo
        // ---------------------------------------------------
        if (!intendedWallet) {
          console.warn("⛔ DEPOSIT REJECTED (invalid or missing memo)", meta);
          continue;
        }

        // ---------------------------------------------------
        // ❌ REJECT: sender ≠ memo wallet
        // ---------------------------------------------------
        if (fromWallet !== intendedWallet) {
          console.warn("⛔ DEPOSIT REJECTED (wallet mismatch)", {
            ...meta,
            memoWallet: intendedWallet,
          });
          continue;
        }

        // ---------------------------------------------------
        // 🔁 STEP 2.2.8 — DEDUPLICATION CHECK
        // ---------------------------------------------------
        const exists = await Deposit.findOne({
          txSignature: sigInfo.signature,
        });

        if (exists) {
          console.log("⏭️ Deposit already recorded, skipping", {
            tx: sigInfo.signature,
          });
          continue;
        }

        // ---------------------------------------------------
        // 👤 FETCH USER
        // ---------------------------------------------------
        const user = await User.findOne({
          walletAddress: intendedWallet,
        });

        if (!user) {
          console.warn("⛔ DEPOSIT REJECTED (user not found)", meta);

          await Deposit.create({
            txSignature: sigInfo.signature,
            fromWallet,
            creditedWallet: intendedWallet,
            amountSol: 0,
            rawAmountSol,
            slot: tx.slot,
            blockTime: tx.blockTime
              ? new Date(tx.blockTime * 1000)
              : null,
            memo,
            status: "rejected_user_not_found",
          });

          continue;
        }

        // ---------------------------------------------------
        // 🔐 MAX DEPOSIT ENFORCEMENT (OPTION B)
        // ---------------------------------------------------
        const remainingCap = Math.max(
          0,
          MAX_DEPOSIT_SOL - (user.balanceSol || 0)
        );

        const creditedSol = Math.min(rawAmountSol, remainingCap);
        const excessSol = rawAmountSol - creditedSol;

        // ---------------------------------------------------
        // 💰 CREDIT USER BALANCE (IF ANY)
        // ---------------------------------------------------
        if (creditedSol > 0) {
          await User.updateOne(
            { walletAddress: intendedWallet },
            {
              $inc: { balanceSol: creditedSol },
            }
          );
        }

        // ---------------------------------------------------
        // 💾 RECORD DEPOSIT
        // ---------------------------------------------------
        await Deposit.create({
          txSignature: sigInfo.signature,
          fromWallet,
          creditedWallet: intendedWallet,
          amountSol: creditedSol,
          rawAmountSol,
          excessSol: excessSol > 0 ? excessSol : 0,
          slot: tx.slot,
          blockTime: tx.blockTime
            ? new Date(tx.blockTime * 1000)
            : null,
          memo,
          status:
            excessSol > 0
              ? "credited_partial_excess_ignored"
              : "credited_full",
        });

        console.log("💰 DEPOSIT PROCESSED", {
          wallet: intendedWallet,
          creditedSol,
          excessSol,
          tx: sigInfo.signature,
        });
      }
    }

    // advance cursor
    lastSignature = signatures[0].signature;
  } catch (err) {
    console.error("Deposit poll error:", err);
  }
}
