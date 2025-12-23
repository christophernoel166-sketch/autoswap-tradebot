import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import { config } from "../config.js";
import { upsertUser, saveEncryptedWallet, openSession, getDecryptedWalletArray, closeSession } from "../service/userService.js";
import { getOrCreateManager } from "../service/tradeService.js";
import { createManualTrader } from "../core/manualTradeLogic.js";
import  Trade  from "../models/Trade.js";
import { isValidMint } from "../security/validators.js";
import { PublicKey } from "@solana/web3.js";

export function createBot() {
  const bot = new Telegraf(config.telegramToken);

  // ───────────────────────────────────────────────
  // 🟢 START + HELP
  // ───────────────────────────────────────────────
  bot.start(async (ctx) => {
    await upsertUser(String(ctx.from.id), ctx.from.username || "");
    await ctx.reply(
      "👋 Welcome to Solana Unified Trader!\n\nUse /help to see available commands."
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.replyWithMarkdown(
      `*Available commands:*\n
/wallet (upload JSON) → then reply /setpass <password>\n
/unlock <password>\n
/lock\n
/buy <mint> <amountSOL>\n
/sell <mint> [rawAmount]\n
/autotrade <mint> [amount stopLoss trigger trail tpMode TP1 TP2 TP3]\n
/stoptrade <id>\n
/list\n
/status`
    );
  });

  // ───────────────────────────────────────────────
  // 🔐 WALLET UPLOAD & ENCRYPTION
  // ───────────────────────────────────────────────
  bot.command("setpass", async (ctx) => {
    const pass = ctx.message.text.split(" ").slice(1).join(" ");
    if (!pass)
      return ctx.reply("Usage: reply to your wallet file with /setpass <password>");
    const reply = ctx.message.reply_to_message;
    if (!reply?.document)
      return ctx.reply("Reply to your wallet JSON file message with /setpass");

    try {
      const link = await ctx.telegram.getFileLink(reply.document.file_id);
      const res = await fetch(link.href);
      const text = await res.text();
      JSON.parse(text); // validate JSON
      await saveEncryptedWallet(String(ctx.from.id), text, pass);
      await ctx.reply("✅ Encrypted wallet saved. Use /unlock <password> to trade.");
    } catch (e) {
      await ctx.reply("❌ Invalid wallet or save failed: " + e.message);
    }
  });

  // ───────────────────────────────────────────────
  // 🔓 SESSION MANAGEMENT
  // ───────────────────────────────────────────────
  bot.command("unlock", async (ctx) => {
    const pass = ctx.message.text.split(" ").slice(1).join(" ");
    if (!pass) return ctx.reply("Usage: /unlock <password>");
    try {
      await openSession(String(ctx.from.id), pass);
      await ctx.reply("🔓 Session unlocked for 12 hours.");
    } catch (e) {
      await ctx.reply("❌ " + e.message);
    }
  });

  bot.command("lock", async (ctx) => {
    await closeSession(String(ctx.from.id));
    await ctx.reply("🔒 Session closed.");
  });

  // ───────────────────────────────────────────────
  // 💰 MANUAL TRADING
  // ───────────────────────────────────────────────
  bot.command("buy", async (ctx) => {
    const [mint, amount] = ctx.message.text.split(" ").slice(1);
    if (!isValidMint(mint)) return ctx.reply("❌ Invalid token mint address.");
    if (!amount) return ctx.reply("Usage: /buy <mint> <amountSOL>");

    try {
      const passMsg = await ctx.reply("🔑 Reply with your password to confirm BUY.");
      const passReply = await new Promise((resolve) => {
        const handler = (m) => {
          if (m.reply_to_message?.message_id === passMsg.message_id) {
            bot.off("text", handler);
            resolve(m);
          }
        };
        bot.on("text", handler);
      });

      const pass = passReply.text.trim();
      const walletArr = await getDecryptedWalletArray(String(ctx.from.id), pass);
      const trader = createManualTrader({
        rpcUrl: config.solana.rpcUrl,
        walletSecretArray: walletArr,
        slippageBps: config.solana.slippageBps,
        feeWallet: config.solana.feeWallet,
      });

      const res = await trader.buyToken(mint, Number(amount));
      await Trade.create({
        tgId: String(ctx.from.id),
        tradeType: "manual",
        tokenMint: mint,
        params: { amountSol: Number(amount) },
        status: "submitted",
        buyTxid: res.txid,
      });

      await ctx.reply(`✅ Buy submitted.\nTxid: ${res.txid}`);
    } catch (e) {
      await ctx.reply("❌ Buy failed: " + e.message);
    }
  });

  bot.command("sell", async (ctx) => {
    const [mint, rawArg] = ctx.message.text.split(" ").slice(1);
    if (!isValidMint(mint)) return ctx.reply("❌ Invalid token mint address.");

    try {
      const passMsg = await ctx.reply("🔑 Reply with your password to confirm SELL.");
      const passReply = await new Promise((resolve) => {
        const handler = (m) => {
          if (m.reply_to_message?.message_id === passMsg.message_id) {
            bot.off("text", handler);
            resolve(m);
          }
        };
        bot.on("text", handler);
      });

      const pass = passReply.text.trim();
      const walletArr = await getDecryptedWalletArray(String(ctx.from.id), pass);
      const trader = createManualTrader({
        rpcUrl: config.solana.rpcUrl,
        walletSecretArray: walletArr,
        slippageBps: config.solana.slippageBps,
        feeWallet: config.solana.feeWallet,
      });

      // get balance if user didn't specify amount
      let amountRaw = rawArg ? Number(rawArg) : null;
      if (!amountRaw) {
        const resp = await trader.connection.getTokenAccountsByOwner(
          trader.wallet.publicKey,
          { mint: new PublicKey(mint) }
        );
        if (!resp?.value?.length) return ctx.reply("No token balance found.");
        let best = 0;
        for (const a of resp.value) {
          const bal = await trader.connection.getTokenAccountBalance(a.pubkey);
          const n = Number(bal.value.amount);
          if (n > best) best = n;
        }
        amountRaw = best;
      }

      const res = await trader.sellToken(mint, amountRaw);
      await Trade.create({
        tgId: String(ctx.from.id),
        tradeType: "manual",
        tokenMint: mint,
        params: { amountRaw },
        status: "submitted",
        sellTxid: res.txid,
      });

      await ctx.reply(`✅ Sell submitted.\nTxid: ${res.txid}`);
    } catch (e) {
      await ctx.reply("❌ Sell failed: " + e.message);
    }
  });

  // ───────────────────────────────────────────────
  // 🤖 AUTO TRADING
  // ───────────────────────────────────────────────
  bot.command("autotrade", async (ctx) => {
    const [mint, amt = "0.01", sl = "20", trigger = "10", trail = "5", mode = "0", tp1 = "0", tp2 = "0", tp3 = "0"] =
      ctx.message.text.split(" ").slice(1);
    if (!isValidMint(mint)) return ctx.reply("❌ Invalid mint address.");

    try {
      const passMsg = await ctx.reply("🔑 Reply with your password to start AUTO trade.");
      const passReply = await new Promise((resolve) => {
        const handler = (m) => {
          if (m.reply_to_message?.message_id === passMsg.message_id) {
            bot.off("text", handler);
            resolve(m);
          }
        };
        bot.on("text", handler);
      });

      const pass = passReply.text.trim();
      const walletArr = await getDecryptedWalletArray(String(ctx.from.id), pass);
      const mgr = getOrCreateManager({
        tgId: String(ctx.from.id),
        walletSecretArray: walletArr,
        rpcUrl: config.solana.rpcUrl,
        feeWallet: config.solana.feeWallet,
      });

      const t = await mgr.startTrade({
        tokenMint: new PublicKey(mint),
        tradeAmountSol: Number(amt),
        stopLossPct: Number(sl),
        trailingTriggerPct: Number(trigger),
        trailingDistancePct: Number(trail),
        tpMode: Number(mode),
        TP1: Number(tp1),
        TP2: Number(tp2),
        TP3: Number(tp3),
      });

      await Trade.create({
        tgId: String(ctx.from.id),
        tradeType: "auto",
        tokenMint: mint,
        params: { amountSol: Number(amt) },
        status: "running",
        buyTxid: t?.buyTxid || null,
      });

      await ctx.reply(`✅ Auto-trade started. Local ID: ${t.id}`);
    } catch (e) {
      await ctx.reply("❌ Auto-trade failed: " + e.message);
    }
  });

  bot.command("stoptrade", async (ctx) => {
    const id = Number(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("Usage: /stoptrade <id>");
    try {
      const mgr = getOrCreateManager({ tgId: String(ctx.from.id) });
      mgr.cancel(id);
      await ctx.reply(`🛑 Auto-trade #${id} stopped.`);
    } catch (e) {
      await ctx.reply("❌ " + e.message);
    }
  });

  // ───────────────────────────────────────────────
  // 📋 TRADE LIST
  // ───────────────────────────────────────────────
  bot.command("list", async (ctx) => {
    const trades = await Trade.find({ tgId: String(ctx.from.id) })
      .sort({ createdAt: -1 })
      .limit(20);
    if (!trades.length) return ctx.reply("No trades found.");
    const lines = trades.map(
      (t) => `${t.tradeType.toUpperCase()} | ${t.tokenMint} | ${t.status}`
    );
    await ctx.reply(lines.join("\n"));
  });

  return bot;
}
