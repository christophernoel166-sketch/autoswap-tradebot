import {
  Connection,
  Keypair,
  VersionedTransaction,
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";

export function createManualTrader({ rpcUrl, walletSecretArray, slippageBps = 100, feeWallet }) {
  const connection = new Connection(rpcUrl, "confirmed");
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletSecretArray));
  const jupiter = createJupiterApiClient({
    baseUrl: "https://quote-api.jup.ag/v6",
    defaultHeaders: { "x-api-user": "manual-trader" },
  });

  async function buildAndSendSwap(quoteResponse, extraOpts = {}) {
    const swapReq = {
      swapRequest: {
        quoteResponse,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        asLegacyTransaction: false,
        ...extraOpts,
      },
    };

    const swapRes = await jupiter.swapPost(swapReq);
    if (!swapRes?.swapTransaction) throw new Error("No swap transaction returned from Jupiter");

    const swapBuf = Buffer.from(swapRes.swapTransaction, "base64");
    try {
      const vtx = VersionedTransaction.deserialize(swapBuf);
      vtx.sign([wallet]);
      const sig = await connection.sendRawTransaction(vtx.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(sig, "confirmed");
      return sig;
    } catch (e) {
      const ltx = Transaction.from(swapBuf);
      ltx.partialSign(wallet);
      const sig = await connection.sendRawTransaction(ltx.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(sig, "confirmed");
      return sig;
    }
  }

  async function buyToken(tokenMintStr, amountSol) {
    const inputMint = "So11111111111111111111111111111111111111112";
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const feeLamports = feeWallet ? Math.floor(amountLamports * 0.002) : 0;
    const effective = amountLamports - feeLamports;

    if (feeLamports > 0) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(feeWallet),
          lamports: feeLamports,
        })
      );
      await connection.sendTransaction(tx, [wallet], { skipPreflight: true });
    }

    const quote = await jupiter.quoteGet({
      inputMint,
      outputMint: tokenMintStr,
      amount: effective,
      slippageBps,
    });

    if (!quote?.outAmount) throw new Error("No buy quote received from Jupiter");
    const txid = await buildAndSendSwap(quote);
    return { txid, quote };
  }

  async function sellToken(tokenMintStr, amountRaw) {
    const quote = await jupiter.quoteGet({
      inputMint: tokenMintStr,
      outputMint: "So11111111111111111111111111111111111111112",
      amount: Math.floor(amountRaw),
      slippageBps,
      restrictIntermediateTokens: true,
    });
    if (!quote?.outAmount) throw new Error("No sell quote received from Jupiter");

    const sellOutLamports = Math.floor(Number(quote.outAmount));
    const feeLamports = feeWallet ? Math.floor(sellOutLamports * 0.01) : 0;

    if (feeLamports > 0) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(feeWallet),
          lamports: feeLamports,
        })
      );
      await connection.sendTransaction(tx, [wallet], { skipPreflight: true });
    }

    const txid = await buildAndSendSwap(quote);
    return { txid, quote };
  }

  return { connection, wallet, buyToken, sellToken };
}
