import {
  PublicKey,
  Transaction,
} from "@solana/web3.js";

import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from "@solana/spl-token";

export async function withdrawSplToken({
  connection,
  payer,
  mintAddress,
  destinationWallet,
  amount,
}) {
  try {

    const mint = new PublicKey(
      mintAddress
    );

    const destination =
      new PublicKey(
        destinationWallet
      );

// ==========================================
// Sender token account
// ==========================================
const senderTokenAccount =
  await getAssociatedTokenAddress(
    mint,
    payer.publicKey
  );

// ==========================================
// Receiver token account
// ==========================================
const receiverTokenAccount =
  await getAssociatedTokenAddress(
    mint,
    destination
  );

const transaction =
  new Transaction();

// ==========================================
// Check receiver ATA
// ==========================================
const receiverAccountInfo =
  await connection.getAccountInfo(
    receiverTokenAccount
  );

// ==========================================
// Create receiver ATA if missing
// ==========================================
if (!receiverAccountInfo) {

  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      receiverTokenAccount,
      destination,
      mint
    )
  );

}

// ==========================================
// Transfer token
// ==========================================
transaction.add(
  createTransferInstruction(
    senderTokenAccount,
    receiverTokenAccount,
    payer.publicKey,
    amount
  )
);

// ==========================================
// Send transaction
// ==========================================
const signature =
  await connection.sendTransaction(
    transaction,
    [payer]
  );

// ==========================================
// Confirm transaction
// ==========================================
await connection.confirmTransaction(
  signature,
  "confirmed"
);

return {
  success: true,
  signature,
};

  } catch (error) {