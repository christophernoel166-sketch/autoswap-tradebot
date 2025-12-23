import { Connection, PublicKey } from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import  Trade  from "../models/Trade.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// import your existing trade logic
import { startTrade as startAutoTrade } from "../core/tradeLogic.js"; // adjust path if needed

// memory-based manager cache per user
const managers = new Map();

export function getOrCreateManager({ tgId, walletSecretArray, rpcUrl, feeWallet }) {
  if (!managers.has(tgId)) {
    const connection = new Connection(rpcUrl, "confirmed");
    const jupiter = createJupiterApiClient({ baseUrl: "https://quote-api.jup.ag/v6" });

    // We'll track all user trades here
    const userMgr = {
      connection,
      jupiter,
      trades: new Map(),

      async startTrade(params) {
        const id = this.trades.size + 1;
        const walletArr = Uint8Array.from(walletSecretArray);
        const tradeParams = {
          connection: this.connection,
          wallet: walletArr,
          tokenMint: new PublicKey(params.tokenMint),
          tradeAmountSol: Number(params.tradeAmountSol),
          stopLossPct: params.stopLossPct,
          trailingTriggerPct: params.trailingTriggerPct,
          trailingDistancePct: params.trailingDistancePct,
          tpMode: params.tpMode,
          TP1: params.TP1,
          TP2: params.TP2,
          TP3: params.TP3,
        };

        const t = await startAutoTrade(id, tradeParams, feeWallet);
        this.trades.set(id, t);
        return { id, ...t };
      },

      cancel(id) {
        const t = this.trades.get(id);
        if (!t) throw new Error("Trade not found.");
        if (t.state?.pollHandle) clearInterval(t.state.pollHandle);
        this.trades.delete(id);
      },
    };

    managers.set(tgId, userMgr);
  }

  return managers.get(tgId);
}
