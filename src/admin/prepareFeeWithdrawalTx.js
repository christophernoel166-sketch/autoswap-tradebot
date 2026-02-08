// src/admin/prepareFeeWithdrawalTx.js
import {
  Connection,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";

import { INTERNAL_TRADING_WALLET } from "../solana/internalWallet.js";

import { getFeeBalance } from "./getFeeBalance.js";

const RPC_URL = process.env.RPC_URL;
const ADMIN_FEE_WALLET = process.env.ADMIN_FEE_WALLET;

if (!RPC_URL) throw new Error("RPC_URL missing");
if (!ADMIN_FEE_WALLET) throw new Error("ADMIN_FEE_WALLET missing");

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Prepare (but DO NOT SEND) admin fee withdrawal transaction
 */
export async function prepareFeeWithdrawalTx() {
  // --------------------------------------------------
  // 1️⃣ Load fee balance
  // --------------------------------------------------
  const { totalSol, feeCount } = await getFeeBalance();

  if (totalSol <= 0) {
    throw new Error("no_fees_available");
  }

  const lamports = Math.floor(totalSol * LAMPORTS_PER_SOL);

  // --------------------------------------------------
  // 2️⃣ Build transaction
  // --------------------------------------------------
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: INTERNAL_TRADING_WALLET.publicKey,
      toPubkey: new PublicKey(ADMIN_FEE_WALLET),
      lamports,
    })
  );

  // NOTE: intentionally NOT signing or sending
  tx.feePayer = INTERNAL_TRADING_WALLET.publicKey;

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  return {
    tx,
    summary: {
      totalSol,
      lamports,
      feeCount,
      from: INTERNAL_TRADING_WALLET.publicKey.toBase58(),
      to: ADMIN_FEE_WALLET,
    },
  };
}
