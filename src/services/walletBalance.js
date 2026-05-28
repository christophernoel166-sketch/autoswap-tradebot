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
    console.log("🧪 balance fetch start", {
      walletAddress,
      mintAddress,
    });

    const owner =
      new PublicKey(walletAddress);

    const mint =
      new PublicKey(mintAddress);

    const accounts =
      await connection.getParsedTokenAccountsByOwner(
        owner,
        { mint }
      );

    console.log(
      "🧪 token accounts found:",
      accounts?.value?.length || 0
    );

    if (
      !accounts?.value ||
      accounts.value.length === 0
    ) {
      console.log("🧪 NO TOKEN ACCOUNT FOUND");

      return 0;
    }

    const balance =
      accounts.value[0]?.account?.data?.parsed?.info
        ?.tokenAmount?.uiAmount;

    console.log("🧪 REAL TOKEN BALANCE:", balance);

    return Number(balance || 0);

  } catch (err) {
    console.error(
      "❌ wallet balance fetch failed:",
      err
    );

    return 0;
  }
}