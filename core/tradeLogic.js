// core/tradeLogic.js
// Lightweight adapter for auto-trading logic (connects to your autoTrade-trailing.js)

import { Keypair } from "@solana/web3.js";
import { startTradeWrapper as baseStartTrade } from "../autoTrade-trailing.js";
 // use your existing file here

// This function is used by tradeService.js
export async function startTrade(id, params, feeWallet) {
  try {
    const wallet = Keypair.fromSecretKey(Uint8Array.from(params.wallet));
    const enrichedParams = {
      ...params,
      wallet,
      feeWallet,
    };

    // Run your existing trade logic
    const result = await baseStartTrade(id, enrichedParams);
    return result;
  } catch (err) {
    console.error("Error starting trade:", err.message);
    throw err;
  }
}
