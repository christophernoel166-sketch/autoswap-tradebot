// autoTrade-trailing.js
// Multi-trade Devnet trailing stop auto-trader (single-file, native-only UI improvements)
// Run: node autoTrade-trailing.js

import { Connection, Keypair, clusterApiUrl, VersionedTransaction, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import fs from "fs";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

// ----------------- CONFIG -----------------
const RPC_URL = process.env.RPC_URL || clusterApiUrl("devnet");
const WALLET_PATH = process.env.WALLET_PATH || "./main-wallet.json";
const FEE_WALLET = process.env.FEE_WALLET; // required (SOL address)
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15_000);
const SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS || 100); // 1% default

if (!FEE_WALLET) {
  console.error("❌ FEE_WALLET not set in .env — add FEE_WALLET=<pubkey>");
  process.exit(1);
}

// ----------------- ANSI COLORS -----------------
const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bright: "\x1b[1m",
};

function colorize(text, col) { return `${col || ""}${text}${C.reset}`; }

// ----------------- helpers -----------------
function loadWallet(path) {
  if (!fs.existsSync(path)) throw new Error(`Wallet file not found at ${path}`);
  const raw = fs.readFileSync(path, "utf8");
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

// ----------------- readline + ask -----------------
// We'll create a completer to help tab-complete commands
function commandCompleter(line) {
  const commands = ["new", "n", "list", "sell", "cancel", "help", "quit", "exit", "t", "status"];
  const hits = commands.filter((c) => c.startsWith(line));
  // If nothing matched, return the full command list to show suggestions
  return [hits.length ? hits : commands, line];
}

const mainRl = readline.createInterface({ input: process.stdin, output: process.stdout, completer: commandCompleter });

// ask() uses mainRl.question but temporarily removes global 'line' listeners to avoid duplication
function ask(prompt) {
  return new Promise((res) => {
    const listeners = mainRl.listeners("line").slice();
    for (const l of listeners) mainRl.removeListener("line", l);
    mainRl.question(prompt, (ans) => {
      for (const l of listeners) mainRl.on("line", l);
      res(ans.trim());
    });
  });
}

// ----------------- Jupiter client -----------------
const jupiter = createJupiterApiClient({
  baseUrl: "https://quote-api.jup.ag/v6",
  defaultHeaders: { "x-api-user": "devnet" },
});

// ----------------- Solana helpers -----------------
async function buildAndSendSwap(jupiterClient, connection, wallet, quoteResponse, extraOpts = {}) {
  const swapReq = {
    swapRequest: {
      quoteResponse,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      asLegacyTransaction: true,
      ...extraOpts,
    },
  };

  const swapRes = await jupiterClient.swapPost(swapReq);
  if (!swapRes || !swapRes.swapTransaction) throw new Error("No swap transaction returned from Jupiter");

  const swapBuf = Buffer.from(swapRes.swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(swapBuf);

  try {
    tx.sign([wallet]);
  } catch (err) {
    throw new Error("Failed to sign transaction: " + (err?.message ?? err));
  }

  const signed = tx.serialize();

  let txid;
  try {
    txid = await connection.sendRawTransaction(signed, { skipPreflight: true });
  } catch (err) {
    const details = [];
    try {
      if (err?.logs) details.push("logs: " + JSON.stringify(err.logs));
      if (err?.message) details.push("message: " + err.message);
    } catch (e) {}
    const errMsg = `Failed to sendRawTransaction: ${(err?.message ?? err)} ${details.length ? " | " + details.join(" | ") : ""}`;
    throw new Error(errMsg);
  }

  try {
    await connection.confirmTransaction(txid, "confirmed");
  } catch (confirmErr) {
    console.warn(colorize("Warning: confirmTransaction timed out or failed: " + (confirmErr?.message ?? confirmErr), C.yellow));
  }

  return txid;
}

async function getTokenAccountBalanceInfo(connection, ownerPubkey, mintPubkey) {
  try {
    const resp = await connection.getTokenAccountsByOwner(ownerPubkey, { mint: new PublicKey(mintPubkey) });
    if (!resp || !resp.value || resp.value.length === 0) return null;
    const first = resp.value[0];
    const bal = await connection.getTokenAccountBalance(first.pubkey);
    return {
      accountPubkey: first.pubkey,
      amountRaw: Number(bal.value.amount),
      uiAmount: bal.value.uiAmount,
      decimals: bal.value.decimals,
    };
  } catch (err) {
    throw err;
  }
}

async function sendSolTransfer(connection, wallet, toPubkeyStr, lamports) {
  const to = new PublicKey(toPubkeyStr);
  const tx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: to,
    lamports,
  }));
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: true });
  try {
    await connection.confirmTransaction(sig, "confirmed");
  } catch (e) {
    console.warn(colorize("Warning: fee transfer confirmation timed out or failed: " + (e?.message ?? e), C.yellow));
  }
  return sig;
}

// ----------------- Multi-trade manager -----------------
const trades = new Map(); // tradeId -> { id, params, state }
let nextTradeId = 1;

function logT(id, ...args) {
  console.log(colorize(`[T${id}]`, C.cyan), ...args);
}

// ----------------- Trading functions (your logic kept mostly intact) -----------------
async function startTrade(id, params) {
  const { connection, wallet, tokenMint, tradeAmountSol, stopLossPct, trailingTriggerPct, trailingDistancePct, tpMode, TP1, TP2, TP3 } = params;

  trades.set(id, { id, params, state: { status: "starting" } });
  logT(id, "Starting trade...");

  try {
    const tradeLamports = Math.floor(tradeAmountSol * LAMPORTS_PER_SOL);
    const buyFeeLamports = Math.floor(tradeLamports * 0.002);
    const effectiveTradeLamports = tradeLamports - buyFeeLamports;

    // --- Fee logic kept but logs removed ---
    if (buyFeeLamports > 0) {
      // silently send buy fee to fee wallet
      await sendSolTransfer(connection, wallet, FEE_WALLET, buyFeeLamports);
    }

    logT(id, `🔄 Fetching buy quote for ${tradeAmountSol} SOL -> token (after fee ${effectiveTradeLamports / LAMPORTS_PER_SOL} SOL)...`);
    let buyQuote;
    try {
      buyQuote = await jupiter.quoteGet({
        inputMint: "So11111111111111111111111111111111111111112",
        outputMint: tokenMint.toBase58(),
        amount: effectiveTradeLamports,
        slippageBps: SLIPPAGE_BPS,
        restrictIntermediateTokens: true,
      });
    } catch (err) {
      logT(id, colorize("❌ Failed to fetch buy quote (initial): " + (err?.message ?? err), C.red));
      throw new Error("Buy quote failed");
    }
    if (!buyQuote || !buyQuote.outAmount) {
      logT(id, colorize("❌ No valid buy quote returned. Aborting trade." , C.red));
      throw new Error("No buy quote");
    }
    logT(id, "✅ Buy quote OK. Building and sending swap...");

    let buyTxid;
    try {
      buyTxid = await buildAndSendSwap(jupiter, connection, wallet, buyQuote);
      logT(id, "✅ Buy submitted. Txid:", buyTxid);
    } catch (err) {
      const msg = (err?.message ?? "").toString();
      logT(id, colorize("❌ Buy failed: " + msg, C.red));
      if (msg.toLowerCase().includes("too large") || msg.toLowerCase().includes("transaction too large") || msg.toLowerCase().includes("versionedtransaction too large")) {
        logT(id, colorize("⚠️ Transaction too large — attempting to re-quote with onlyDirectRoutes=true (simpler route)...", C.yellow));
        const directQuote = await jupiter.quoteGet({
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: tokenMint.toBase58(),
          amount: effectiveTradeLamports,
          slippageBps: SLIPPAGE_BPS,
          restrictIntermediateTokens: true,
          onlyDirectRoutes: true,
        });
        if (!directQuote || !directQuote.outAmount) {
          logT(id, colorize("❌ No direct route quote available. Aborting trade.", C.red));
          throw new Error("No direct route");
        }
        logT(id, "✅ Direct-route quote found. Trying swap again...");
        buyTxid = await buildAndSendSwap(jupiter, connection, wallet, directQuote);
        logT(id, "✅ Buy submitted (direct route). Txid:", buyTxid);
        buyQuote = directQuote;
      } else {
        throw err;
      }
    }

    await new Promise((r) => setTimeout(r, 5000));

    let tokenAccount = null;
    for (let i = 0; i < 6; i++) {
      try {
        tokenAccount = await getTokenAccountBalanceInfo(connection, wallet.publicKey, tokenMint.toBase58());
        if (tokenAccount) break;
      } catch (err) {
        logT(id, "getTokenAccountBalanceInfo error:", err?.message ?? err);
        if ((err?.message || "").toLowerCase().includes("mint could not be")) break;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (!tokenAccount) {
      logT(id, colorize("⚠️ Token account not found after buy. You may still be awaiting confirmation or token untradable on devnet.", C.yellow));
    } else {
      logT(id, `🔎 Received tokens: ${tokenAccount.uiAmount} (raw: ${tokenAccount.amountRaw}, decimals: ${tokenAccount.decimals})`);
    }

    const entryPriceLamportsPerRawToken = effectiveTradeLamports / Number(buyQuote.outAmount);
    let entryMetric = entryPriceLamportsPerRawToken;
    logT(id, `📈 Entry price metric (lamports/rawToken): ${entryMetric}`);

    const tpMetrics = [];
    const tpPercents = [];
    if (tpMode >= 1) { tpMetrics.push(entryMetric * (1 + TP1 / 100)); tpPercents.push(TP1); }
    if (tpMode >= 2) { tpMetrics.push(entryMetric * (1 + TP2 / 100)); tpPercents.push(TP2); }
    if (tpMode >= 3) { tpMetrics.push(entryMetric * (1 + TP3 / 100)); tpPercents.push(TP3); }

    const state = {
      id,
      tokenMint: tokenMint.toBase58(),
      buyQuote,
      entryMetric,
      trailingActive: false,
      peakMetric: entryMetric,
      remainingRaw: tokenAccount ? tokenAccount.amountRaw : null,
      decimals: tokenAccount ? tokenAccount.decimals : 6,
      executedTP: [false, false, false],
      breakEvenMetric: null,
      status: "running",
      buyTxid,
    };

    trades.set(id, { id, params, state });

    logT(id, "📊 Monitoring price for stop-loss, trailing, and TP levels...");

    state.pollHandle = setInterval(async () => {
      try {
        const tctx = trades.get(id);
        if (!tctx || !tctx.state) { clearInterval(state.pollHandle); return; }
        if (tctx.state.status === "canceled" || tctx.state.status === "finished" || tctx.state.status === "stopped") { clearInterval(state.pollHandle); return; }

        const oneSol = Math.floor(1 * LAMPORTS_PER_SOL);
        const q = await jupiter.quoteGet({
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: tokenMint.toBase58(),
          amount: oneSol,
          slippageBps: SLIPPAGE_BPS,
        });
        if (!q || !q.outAmount) { logT(id, "Price tick unavailable (no quote)."); return; }
        const currentMetric = oneSol / Number(q.outAmount);
        const changePct = ((currentMetric - state.entryMetric) / state.entryMetric) * 100;
        const now = new Date().toISOString();
        const approxSolPerRaw = currentMetric / LAMPORTS_PER_SOL;
        logT(id, `[${now}] metric=${currentMetric.toFixed(12)} (≈ ${approxSolPerRaw} SOL/raw) Δ vs entry: ${changePct.toFixed(2)}%`);

        if (!state.breakEvenMetric) {
          if (changePct <= -Math.abs(stopLossPct)) {
            logT(id, colorize(`🛑 Stop-loss triggered (Δ ${changePct.toFixed(2)}% <= -${stopLossPct}%). Selling now...`, C.red));
            clearInterval(state.pollHandle);
            await sellAllForTrade(id);
            return;
          }
        } else {
          if (currentMetric <= state.breakEvenMetric) {
            logT(id, colorize(`🛑 Price <= BE2. Selling remaining tokens now...`, C.red));
            clearInterval(state.pollHandle);
            await sellAllForTrade(id);
            return;
          }
        }

        if (!state.trailingActive && ((currentMetric - state.entryMetric) / state.entryMetric) * 100 >= Math.abs(trailingTriggerPct)) {
          state.trailingActive = true;
          state.peakMetric = currentMetric;
          logT(id, colorize(`🎯 Trailing activated. Peak=${(state.peakMetric / LAMPORTS_PER_SOL).toFixed(12)} SOL/raw`, C.green));
        }

        if (state.trailingActive) {
          if (currentMetric > state.peakMetric) {
            state.peakMetric = currentMetric;
            logT(id, `🔺 New peak metric: ${(state.peakMetric / LAMPORTS_PER_SOL).toFixed(12)} SOL/raw`);
          }
          const dropPctFromPeak = ((state.peakMetric - currentMetric) / state.peakMetric) * 100;
          if (dropPctFromPeak >= Math.abs(trailingDistancePct)) {
            logT(id, colorize(`📉 Trailing stop triggered (drop ${dropPctFromPeak.toFixed(2)}% >= ${trailingDistancePct}%). Selling now...`, C.yellow));
            clearInterval(state.pollHandle);
            await sellAllForTrade(id);
            return;
          }
        }

        for (let i = 0; i < tpMetrics.length; i++) {
          if (state.executedTP[i]) continue;
          const tpMetric = tpMetrics[i];
          if (currentMetric >= tpMetric) {
            const tpPercent = tpPercents[i];
            let tokAcc = null;
            try { tokAcc = await getTokenAccountBalanceInfo(connection, wallet.publicKey, tokenMint.toBase58()); } catch (e) { logT(id, "TP read token acc failed:", e?.message ?? e); }
            const rawBalanceNow = tokAcc ? tokAcc.amountRaw : state.remainingRaw;
            if (!rawBalanceNow || rawBalanceNow <= 0) {
              logT(id, "No tokens to sell at TP moment.");
              state.executedTP[i] = true;
              continue;
            }
            const sellFraction = Math.min(tpPercent / 100, 1);
            const rawToSellFinal = Math.floor(rawBalanceNow * sellFraction);
            if (rawToSellFinal <= 0) {
              logT(id, `Nothing to sell for TP${i+1} (calculated 0). Marking as executed.`);
              state.executedTP[i] = true;
              continue;
            }
            logT(id, colorize(`🎯 TP${i+1} reached (>= ${tpPercents[i]}%). Selling raw ${rawToSellFinal} ...`, C.green));
            try {
              const res = await executePartialSellForTrade(id, rawToSellFinal);
              logT(id, `✅ TP${i+1} partial sell submitted. Txid: ${res?.txid ?? "unknown"}`);
              state.executedTP[i] = true;
              state.remainingRaw = (rawBalanceNow - rawToSellFinal);
              if (i === 0) {
                state.breakEvenMetric = tpMetric;
                logT(id, colorize(`🔒 BE2 active: break-even protection set at TP1 metric ${(state.breakEvenMetric / LAMPORTS_PER_SOL).toFixed(12)} SOL/raw`, C.cyan));
              }
            } catch (err) {
              logT(id, `❌ TP${i+1} sell failed:`, err?.message ?? err);
            }
          }
        }

      } catch (err) {
        logT(id, "Polling error:", (err?.message ?? err));
      }
    }, POLL_INTERVAL_MS);

  } catch (err) {
    logT(id, colorize("Trade initialization failed: " + (err?.message ?? err), C.red));
    const t = trades.get(id);
    if (t) { t.state = t.state || {}; t.state.status = "error"; if (t.state.pollHandle) clearInterval(t.state.pollHandle); }
  }
}

async function executePartialSellForTrade(tradeId, rawAmountToSell) {
  const t = trades.get(tradeId);
  if (!t) throw new Error("Trade not found");
  return executePartialSell(globalConnection, globalWallet, tradeId, rawAmountToSell);
}

async function sellAllForTrade(tradeId) {
  const t = trades.get(tradeId);
  if (!t) throw new Error("Trade not found");
  const tokenMint = t.params.tokenMint;
  await sellAllTokensAndMarkComplete(globalConnection, globalWallet, tradeId, tokenMint);
}

async function executePartialSell(connection, wallet, tradeId, rawAmountToSell) {
  const t = trades.get(tradeId);
  if (!t) throw new Error("Trade not found");
  const tokenMintPubkey = t.params.tokenMint;

  if (!rawAmountToSell || rawAmountToSell <= 0) {
    console.warn(`[T${tradeId}] Nothing to sell (raw amount zero).`);
    return null;
  }

  let sellQuote;
  try {
    sellQuote = await jupiter.quoteGet({
      inputMint: tokenMintPubkey.toBase58(),
      outputMint: "So11111111111111111111111111111111111111112",
      amount: Math.floor(rawAmountToSell),
      slippageBps: SLIPPAGE_BPS,
      restrictIntermediateTokens: true,
    });
  } catch (err) {
    throw new Error("Failed to fetch sell quote: " + (err?.message ?? err));
  }
  if (!sellQuote || !sellQuote.outAmount) throw new Error("No sell quote returned.");

  let sellOutLamports = Math.floor(Number(sellQuote.outAmount));
  let sellFeeLamports = Math.floor(sellOutLamports * 0.01);

  // --- Fee logic kept but logs removed ---
  if (sellFeeLamports > 0) {
    // silently send sell fee to fee wallet
    await sendSolTransfer(connection, wallet, FEE_WALLET, sellFeeLamports);
  }

  try {
    const txid = await buildAndSendSwap(jupiter, connection, wallet, sellQuote);
    return { txid, sellOutLamports };
  } catch (err) {
    const msg = (err?.message ?? "").toString();
    logT(tradeId, colorize("❌ Sell swap failed: " + msg, C.red));

    if (msg.toLowerCase().includes("too large") || msg.toLowerCase().includes("transaction too large") || msg.toLowerCase().includes("versionedtransaction too large")) {
      logT(tradeId, colorize("⚠️ Sell transaction too large — attempting to re-quote with onlyDirectRoutes=true (simpler route)...", C.yellow));
      let directSellQuote;
      try {
        directSellQuote = await jupiter.quoteGet({
          inputMint: tokenMintPubkey.toBase58(),
          outputMint: "So11111111111111111111111111111111111111112",
          amount: Math.floor(rawAmountToSell),
          slippageBps: SLIPPAGE_BPS,
          restrictIntermediateTokens: true,
          onlyDirectRoutes: true,
        });
      } catch (rqErr) {
        throw new Error("Failed to fetch direct-route sell quote after too-large: " + (rqErr?.message ?? rqErr));
      }
      if (!directSellQuote || !directSellQuote.outAmount) throw new Error("No direct-route sell quote available after too-large error.");

      sellOutLamports = Math.floor(Number(directSellQuote.outAmount));
      sellFeeLamports = Math.floor(sellOutLamports * 0.01);

      if (sellFeeLamports > 0) {
        // silently send sell fee for direct route
        await sendSolTransfer(connection, wallet, FEE_WALLET, sellFeeLamports);
      }

      try {
        const txid2 = await buildAndSendSwap(jupiter, connection, wallet, directSellQuote);
        return { txid: txid2, sellOutLamports };
      } catch (err3) {
        let extra = "";
        try { if (err3?.logs) extra = ` | logs: ${JSON.stringify(err3.logs)}`; } catch (e) {}
        throw new Error("Swap still failed after direct-route attempt: " + (err3?.message ?? err3) + extra);
      }
    } else {
      throw err;
    }
  }
}

async function sellAllTokensAndMarkComplete(connection, wallet, tradeId, tokenMintPubkey) {
  const t = trades.get(tradeId);
  if (!t) throw new Error("Trade not found");

  let tokAcc;
  try {
    tokAcc = await getTokenAccountBalanceInfo(connection, wallet.publicKey, tokenMintPubkey.toBase58());
  } catch (err) {
    logT(tradeId, "Error reading token account before sell:", err?.message ?? err);
    throw err;
  }
  if (!tokAcc || tokAcc.amountRaw <= 0) throw new Error("No token balance found to sell.");
  const rawToSell = tokAcc.amountRaw;

  logT(tradeId, `🔄 Preparing to sell raw token amount ${rawToSell} -> SOL...`);
  try {
    const res = await executePartialSell(connection, wallet, tradeId, rawToSell);
    logT(tradeId, "✅ Sell submitted. Txid:", res?.txid ?? res);

    // ------------------------------
    // Persist completed trade to backend API
    // ------------------------------
    try {
      const st = trades.get(tradeId); // state container
      // gather fields safely
      const buyTxid = st?.state?.buyTxid ?? st?.state?.buyTxid ?? null;
      const sellTxid = res?.txid ?? null;
      const tokenMintStr = (tokenMintPubkey && typeof tokenMintPubkey.toBase58 === "function") ? tokenMintPubkey.toBase58() : String(tokenMintPubkey);
      const receivedTokens = tokAcc?.uiAmount ?? null;
      const entryMetric = st?.state?.entryMetric ?? null;
      const stopLossPercent = t?.params?.stopLossPct ?? null;
      const trailingPercent = t?.params?.trailingTriggerPct ?? null;
      const distancePercent = t?.params?.trailingDistancePct ?? null;

// --- SAFE METRIC + PNL CALCULATION ---
const safe = (x) => (typeof x === "number" && !isNaN(x) ? x : 0);

const entryMetricSafe = safe(entryMetric);

const exitMetricSafe = safe(
  res?.sellOutLamports && rawToSell
    ? res.sellOutLamports / Number(rawToSell)
    : 0
);

const pnlSolSafe = safe(
  res?.sellOutLamports && entryMetricSafe && rawToSell
    ? (res.sellOutLamports - (entryMetricSafe * Number(rawToSell))) / LAMPORTS_PER_SOL
    : 0
);



      // --- NEW: compute exit metric (lamports/rawToken) matching entryMetric units ---
      const sellOutLamports = res?.sellOutLamports ?? null; // lamports returned by sell quote
      const exitMetric = (sellOutLamports && rawToSell) ? (sellOutLamports / Number(rawToSell)) : null;

      // --- NEW: optional PnL in SOL for convenience (not required by backend but helpful) ---
      const pnlSol = (sellOutLamports && entryMetric && rawToSell)
        ? ( (sellOutLamports - (entryMetric * Number(rawToSell))) / LAMPORTS_PER_SOL )
        : null;

      const backendBase = process.env.BACKEND_BASE || process.env.BACKEND_URL || "http://localhost:4000";
      // endpoint expected: POST /api/trades/record  (adjust if your api expects different path)
      const endpoint = `${backendBase.replace(/\/$/, "")}/api/trades/record`;

      // Compose payload - adjust keys to match your backend model if necessary
      const payload = {
        tgId: globalWallet.publicKey.toBase58(),

        tradeType: "auto",
        tokenMint: tokenMintStr,

        // REQUIRED for dashboard volume
        amountSol: t?.params?.tradeAmountSol,
        amountToken: receivedTokens,
        entryPrice: entryMetric,

        // NEW: exit price in same units as entryMetric (lamports/rawToken)
        exitPrice: exitMetric ?? 0,

        // optional convenience field
        pnlSol: pnlSol ?? 0,

        buyTxid: buyTxid,
        sellTxid: sellTxid,
        receivedTokens: receivedTokens,
        stopLossPercent: stopLossPercent,
        trailingPercent: trailingPercent,
        distancePercent: distancePercent,
        status: "closed",
        createdAt: new Date().toISOString()
      };

      // Use node's global fetch (Node 18+). It's safe to not await if you don't want the flow blocked,
      // but here we await so we know whether save succeeded for logs.
      const saveResp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveResp.ok) {
        const text = await saveResp.text().catch(() => "");
        logT(tradeId, "[DB] ❌ Failed to save trade - server responded with status " + saveResp.status + (text ? `: ${text}` : ""));
      } else {
        logT(tradeId, "[DB] ✅ Trade saved to backend");
      }

    // ------------------------------
    // Also send notification to backend
    // ------------------------------
    try {
      const backendBase = process.env.BACKEND_BASE || "http://localhost:4000";

      await fetch(`${backendBase.replace(/\/$/, "")}/api/notifications/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tgId: process.env.ADMIN_TELEGRAM_ID ?? "admin",
          title: "Trade Completed",
          message: `Token ${tokenMintStr} trade has closed.`,
          time: Date.now(),
        }),
      });

      logT(tradeId, "[DB] 🔔 Notification saved to backend");
    } catch (err) {
      logT(tradeId, "[DB] ⚠️ Failed to save notification: " + (err?.message ?? err));
    }

    } catch (err) {
      logT(tradeId, "[DB] ❌ Failed to save trade:", err?.message ?? err);
      // don't rethrow — saving must not interfere with trade logic
    }

    // --- cleanup original flow ---
    const st = trades.get(tradeId);
    if (st && st.state && st.state.pollHandle) clearInterval(st.state.pollHandle);
    if (st) st.state.status = "finished";
    trades.delete(tradeId);
    logT(tradeId, colorize("✅ Trade complete and removed from active trades.", C.green));
  } catch (err) {
    logT(tradeId, colorize("❌ Sell execution failed: " + (err?.message ?? err), C.red));
    throw err;
  }
}

// ----------------- Globals -----------------
const globalConnection = new Connection(RPC_URL, "confirmed");
const globalWallet = loadWallet(WALLET_PATH);

// ----------------- CLI helpers & command handling -----------------
function prettyListActiveTrades() {
  if (trades.size === 0) {
    console.log(colorize("No active trades.", C.yellow));
    return;
  }
  console.log(C.bright + "Active trades:" + C.reset);
  console.log(colorize("ID  | Token (mint)                              | Status    | RemainingRaw | EntryMetric (lamports/raw)", C.magenta));
  for (const [id, t] of trades) {
    const s = t.state || {};
    const token = (t.params && t.params.tokenMint) ? t.params.tokenMint.toBase58() : "unknown";
    const rem = s.remainingRaw ?? "n/a";
    const entry = s.entryMetric ? s.entryMetric.toFixed(6) : "n/a";
    const status = s.status || "starting";
    console.log(`${id.toString().padEnd(3)} | ${token.padEnd(42)} | ${status.padEnd(9)} | ${rem.toString().padEnd(12)} | ${entry}`);
  }
}

function showTradeShort(id) {
  const t = trades.get(id);
  if (!t) { console.log(colorize(`No trade with id ${id}`, C.yellow)); return; }
  const s = t.state || {};
  console.log(colorize(`Trade T${id} — token=${t.params.tokenMint.toBase58()}`, C.cyan));
  console.log(` status: ${s.status || "n/a"}`);
  console.log(` remainingRaw: ${s.remainingRaw ?? "n/a"}`);
  console.log(` entryMetric: ${s.entryMetric ?? "n/a"}`);
  console.log(` trailingActive: ${s.trailingActive ? "yes" : "no"}`);
  console.log(` executedTP: ${JSON.stringify(s.executedTP)}`);
}

async function promptAndStartNewTrade() {
  try {
    const tokenMintInput = await ask("Enter token mint address to buy (SPL token mint): ");
    let tokenMint;
    try { tokenMint = new PublicKey(tokenMintInput.trim()); } catch (e) { console.error(colorize("Invalid mint address.", C.red)); return; }

    const amtStr = await ask("Enter amount of SOL to trade (e.g. 0.01) [default 0.01]: ");
    const tradeAmountSol = amtStr.trim() ? Number(amtStr.trim()) : 0.01;
    if (!tradeAmountSol || isNaN(tradeAmountSol) || tradeAmountSol <= 0) { console.error(colorize("Invalid trade amount.", C.red)); return; }

    const stopStr = await ask("Enter STOP-LOSS percent (e.g. 10 for 10%) [default 20]: ");
    const stopLossPct = stopStr.trim() ? Math.abs(Number(stopStr.trim())) : 20;

    const triggerStr = await ask("Enter TRAILING TRIGGER percent to activate trailing (e.g. 10 for 10%) [default 10]: ");
    const trailingTriggerPct = triggerStr.trim() ? Math.abs(Number(triggerStr.trim())) : 10;

    const distStr = await ask("Enter TRAILING DISTANCE percent (drop from peak to sell) (e.g. 5) [default 5]: ");
    const trailingDistancePct = distStr.trim() ? Math.abs(Number(distStr.trim())) : 5;

    console.log("Select Take-Profit mode:");
    console.log("0 = No TP");
    console.log("1 = TP1 only");
    console.log("2 = TP1 + TP2");
    console.log("3 = TP1 + TP2 + TP3");
    const tpModeStr = await ask("Enter choice (0/1/2/3) [default 0]: ");
    const tpMode = (tpModeStr.trim() ? parseInt(tpModeStr.trim()) : 0);
    if (![0,1,2,3].includes(tpMode)) { console.error(colorize("Invalid TP mode.", C.red)); return; }

    let TP1 = 0, TP2 = 0, TP3 = 0;
    if (tpMode >= 1) TP1 = Math.abs(Number(await ask("Enter TP1 % (e.g. 20): ")));
    if (tpMode >= 2) TP2 = Math.abs(Number(await ask("Enter TP2 % (e.g. 40): ")));
    if (tpMode >= 3) TP3 = Math.abs(Number(await ask("Enter TP3 % (e.g. 80): ")));

    const id = nextTradeId++;
    const params = {
      connection: globalConnection,
      wallet: globalWallet,
      tokenMint,
      tradeAmountSol,
      stopLossPct,
      trailingTriggerPct,
      trailingDistancePct,
      tpMode, TP1, TP2, TP3
    };
    trades.set(id, { id, params, state: { status: "initializing" } });
    startTrade(id, params).catch((e) => logT(id, "startTrade error:", e?.message ?? e));
  } catch (err) {
    console.error(colorize("Failed to create new trade: " + (err?.message ?? err), C.red));
  }
}

function parseIdFromArg(arg) {
  if (!arg) return NaN;
  // try numeric first
  if (/^\d+$/.test(arg)) return Number(arg);
  // try extract digits inside text like "i", "id", "t1", "T1"
  const digits = (arg.match(/\d+/) || [null])[0];
  return digits ? Number(digits) : NaN;
}

async function handleCommand(line) {
  const tokens = (line || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return;
  const cmdRaw = tokens[0].toLowerCase();
  const argRaw = tokens[1] ?? null;

  // support shortcuts: t1 -> show trade 1
  const tShortcut = cmdRaw.match(/^t(\d+)$/i);
  if (tShortcut) {
    const id = Number(tShortcut[1]);
    showTradeShort(id);
    return;
  }

  if (cmdRaw === "n" || cmdRaw === "new") {
    await promptAndStartNewTrade();
    return;
  }

  if (cmdRaw === "list") {
    prettyListActiveTrades();
    return;
  }

  if (cmdRaw === "sell") {
    const id = parseIdFromArg(argRaw);
    if (!id || !trades.has(id)) {
      console.log(colorize("Invalid trade id. Usage: sell <id> (e.g. sell 1) or t<number> to view then sell.", C.yellow));
      return;
    }
    logT(id, "Manual SELL requested by user.");
    try {
      await sellAllForTrade(id);
    } catch (err) {
      logT(id, colorize("Manual sell failed: " + (err?.message ?? err), C.red));
    }
    return;
  }

  if (cmdRaw === "cancel") {
    const id = parseIdFromArg(argRaw);
    if (!id || !trades.has(id)) { console.log(colorize("Invalid trade id. Usage: cancel <id>", C.yellow)); return; }
    const t = trades.get(id);
    if (t && t.state && t.state.pollHandle) clearInterval(t.state.pollHandle);
    t.state.status = "canceled";
    trades.delete(id);
    console.log(colorize(`T${id} canceled and removed from active trades.`, C.yellow));
    return;
  }

  if (cmdRaw === "help") {
    console.log(colorize("Commands:", C.bright));
    console.log("  n | new               -> start interactive new trade");
    console.log("  list                 -> list active trades");
    console.log("  t<id>                -> show short status for trade id (e.g. t1)");
    console.log("  sell <id>            -> sell all tokens for trade id now");
    console.log("  cancel <id>          -> cancel trade monitoring and remove");
    console.log("  quit | exit          -> stop manager");
    console.log("  help                 -> this help");
    return;
  }

  if (cmdRaw === "quit" || cmdRaw === "exit") {
    console.log(colorize("Shutting down manager. Stopping monitors (does not sell open trades).", C.yellow));
    for (const [id, t] of trades) {
      if (t && t.state && t.state.pollHandle) clearInterval(t.state.pollHandle);
      t.state.status = "stopped";
    }
    mainRl.close();
    process.exit(0);
  }

  console.log(colorize("Unknown command. Type 'help' for list.", C.yellow));
}

// wire up mainRl 'line' listener
mainRl.on("line", (line) => {
  handleCommand(line).catch((e) => console.error("Command handler error:", e?.message ?? e));
});

// ----------------- Start manager -----------------
async function mainManager() {
  console.log(colorize("🚀 Multi-Trade Devnet Trailing Stop Auto-Trader (manager)", C.bright));
  console.log("Using wallet:", colorize(globalWallet.publicKey.toBase58(), C.cyan));
  const solBal = await globalConnection.getBalance(globalWallet.publicKey) / LAMPORTS_PER_SOL;
  console.log("💰 Wallet SOL balance:", colorize(solBal.toFixed(6) + " SOL", C.green));
  // show fee wallet but hide fee percentages from console
  console.log("Fee wallet:", colorize(FEE_WALLET, C.magenta));
  console.log("Type 'n' or 'new' to start a new trade, 'list' to view active trades, 'help' for commands.");
}

export async function startTradeWrapper(id, params) {
  return new Promise((resolve, reject) => {
    try {
      startTrade(id, params).then(resolve).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}


// Run as standalone CLI only if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mainManager().catch((e) => {
    console.error(colorize("Fatal manager error: " + (e?.message ?? e), C.red));
    process.exit(1);
  });
}
