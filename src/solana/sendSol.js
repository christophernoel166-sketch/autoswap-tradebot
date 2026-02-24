// src/solana/sendSol.js
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "../utils/solanaConnection.js";

/**
 * Send SOL from a user's wallet with a platform withdrawal fee.
 *
 * @param {Object} params
 * @param {import("@solana/web3.js").Keypair} params.wallet - SIGNER (user trading wallet)
 * @param {string|PublicKey} params.to - destination address
 * @param {number} params.amountSol - amount to withdraw (SOL)
 * @param {string|PublicKey} [params.feeWallet] - fee receiver (defaults to process.env.FEE_WALLET)
 * @param {number} [params.feeSol] - withdrawal fee in SOL (defaults to 0.005)
 * @param {boolean} [params.subtractFeeFromAmount] - if true, fee is taken from amountSol
 *
 * @returns {Promise<{ signature: string, sentLamports: number, feeLamports: number }>}
 */
export async function sendSol({
  wallet,
  to,
  amountSol,
  feeWallet = process.env.FEE_WALLET,
  feeSol = 0.005,
  subtractFeeFromAmount = false,
}) {
  const connection = getConnection();

  if (!wallet?.publicKey) throw new Error("sendSol: wallet signer is required");
  if (!feeWallet) throw new Error("sendSol: FEE_WALLET is required");
  if (typeof amountSol !== "number" || amountSol <= 0) {
    throw new Error("sendSol: amountSol must be > 0");
  }

  const toPubkey = to instanceof PublicKey ? to : new PublicKey(String(to));
  const feePubkey =
    feeWallet instanceof PublicKey ? feeWallet : new PublicKey(String(feeWallet));

  const feeLamports = Math.floor(feeSol * LAMPORTS_PER_SOL);

  // Amount the user receives
  let sendLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  if (subtractFeeFromAmount) {
    // user enters "amountSol" as total outflow; user receives (amount - fee)
    sendLamports = sendLamports - feeLamports;
    if (sendLamports <= 0) {
      throw new Error("sendSol: amountSol is too small after subtracting fee");
    }
  }

  // Balance guard
  const balance = await connection.getBalance(wallet.publicKey, "confirmed");

  // Small buffer for network fees
  const BUFFER_LAMPORTS = 100_000;

  const requiredLamports = subtractFeeFromAmount
    ? sendLamports + feeLamports + BUFFER_LAMPORTS
    : sendLamports + feeLamports + BUFFER_LAMPORTS;

  if (balance < requiredLamports) {
    throw new Error(
      `sendSol: insufficient SOL. balance=${balance} required=${requiredLamports}`
    );
  }

  // One tx, two transfers: fee + user payout
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: feePubkey,
      lamports: feeLamports,
    }),
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: toPubkey,
      lamports: sendLamports,
    })
  );

  const signature = await connection.sendTransaction(tx, [wallet], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(signature, "confirmed");

  return { signature, sentLamports: sendLamports, feeLamports };
}

// ✅ ALIAS FOR LEGACY / CLARITY
export const sendSolToUser = sendSol;