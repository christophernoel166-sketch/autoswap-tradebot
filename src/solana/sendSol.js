// src/solana/sendSol.js
import {
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { INTERNAL_TRADING_WALLET } from "./internalWallet.js";
import { getConnection } from "../utils/solanaConnection.js";

export async function sendSolToUser({ to, amountSol }) {
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
