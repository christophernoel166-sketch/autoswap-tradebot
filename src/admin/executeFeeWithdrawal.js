// src/admin/executeFeeWithdrawal.js
import {
  Connection,
} from "@solana/web3.js";

import { INTERNAL_TRADING_WALLET } from "../solana/internalWallet.js";

import Fee from "../../models/Fee.js";
import { prepareFeeWithdrawalTx } from "./prepareFeeWithdrawalTx.js";

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) throw new Error("RPC_URL missing");

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Execute admin fee withdrawal (ONE-TIME)
 */
export async function executeFeeWithdrawal() {
  // --------------------------------------------------
  // 1️⃣ Build transaction (read-only preparation)
  // --------------------------------------------------
  const { tx, summary } = await prepareFeeWithdrawalTx();

  // --------------------------------------------------
  // 2️⃣ Send transaction (SIGN + SEND)
  // --------------------------------------------------
  const signature = await connection.sendTransaction(
    tx,
    [INTERNAL_TRADING_WALLET],
    { skipPreflight: false }
  );

  await connection.confirmTransaction(signature, "confirmed");

  // --------------------------------------------------
  // 3️⃣ Mark fees as withdrawn
  // --------------------------------------------------
  await Fee.updateMany(
    { status: "recorded" },
    {
      $set: {
        status: "withdrawn",
        withdrawnAt: new Date(),
        txSignature: signature,
      },
    }
  );

  return {
    ok: true,
    txSignature: signature,
    withdrawnSol: summary.totalSol,
    feeCount: summary.feeCount,
    adminWallet: summary.to,
  };
}
