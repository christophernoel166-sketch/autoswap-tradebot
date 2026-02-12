// src/solana/sendSol.js
import {
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "../utils/solanaConnection.js";

export async function sendSol({ to, amountSol }) {
  const connection = getConnection();

  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: INTERNAL_TRADING_WALLET.publicKey,
      toPubkey: to,
      lamports,
    })
  );

  const sig = await connection.sendTransaction(tx, [
    INTERNAL_TRADING_WALLET,
  ]);

  await connection.confirmTransaction(sig, "confirmed");

  return sig;
}

// ✅ ALIAS FOR LEGACY / CLARITY
export const sendSolToUser = sendSol;
