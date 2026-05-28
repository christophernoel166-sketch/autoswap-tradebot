import {
  Connection,
  PublicKey,
} from "@solana/web3.js";

const RPC_URL =
  process.env.RPC_URL;

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
    const owner =
      new PublicKey(walletAddress);

    const mint =
      new PublicKey(mintAddress);

    // ✅ Find token accounts directly
    const accounts =
      await connection.getParsedTokenAccountsByOwner(
        owner,
        { mint }
      );

    if (
      !accounts?.value ||
      accounts.value.length === 0
    ) {
      return 0;
    }

    const balance =
      accounts.value[0]?.account?.data?.parsed?.info
        ?.tokenAmount?.uiAmount;

    return Number(balance || 0);

  } catch (err) {
    console.error(
      "wallet balance fetch failed:",
      err?.message
    );

    return 0;
  }
}