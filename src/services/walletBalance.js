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
    console.log(
      "🧪 balance fetch start",
      {
        walletAddress,
        mintAddress,
      }
    );

    const wallet =
      new PublicKey(walletAddress);

    const mint =
      new PublicKey(mintAddress);

    // ✅ THIS IS THE IMPORTANT FIX
    const tokenAccounts =
      await connection.getParsedTokenAccountsByOwner(
        wallet,
        {
          mint,
        }
      );

    console.log(
      "🧪 token accounts found:",
      tokenAccounts.value.length
    );

    if (!tokenAccounts.value.length) {
      console.log(
        "🧪 NO TOKEN ACCOUNT FOUND"
      );

      return 0;
    }

    const account =
      tokenAccounts.value[0];

    const amount =
      Number(
        account.account.data
          .parsed.info.tokenAmount
          .uiAmount || 0
      );

    console.log(
      "🧪 REAL TOKEN BALANCE:",
      amount
    );

    return amount;

  } catch (err) {
    console.error(
      "❌ getWalletTokenBalance failed",
      err
    );

    return 0;
  }
}