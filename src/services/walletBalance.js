import {
  Connection,
  PublicKey,
} from "@solana/web3.js";

import {
  getAssociatedTokenAddress,
} from "@solana/spl-token";

const RPC_URL =
  process.env.SOLANA_RPC_URL;

const connection =
  new Connection(RPC_URL, "confirmed");

/**
 * ===================================================
 * 🪙 Get REAL wallet token balance
 * ===================================================
 */
export async function getWalletTokenBalance(
  walletAddress,
  mintAddress
) {
  try {
    const wallet =
      new PublicKey(walletAddress);

    const mint =
      new PublicKey(mintAddress);

    const ata =
      await getAssociatedTokenAddress(
        mint,
        wallet
      );

    const balance =
      await connection.getTokenAccountBalance(
        ata
      );

    return Number(
      balance?.value?.uiAmount || 0
    );

  } catch (err) {
    return 0;
  }
}