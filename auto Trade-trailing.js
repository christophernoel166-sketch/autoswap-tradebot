// autotrader-updated.js
// Production-ready improvements to the Solana AutoTrade Telegram Bot
// Dynamic channel management (channels stored in MongoDB)
// + Manual trading system integrated (non-subscribers can trade with custom SL/TP/trailing)
// + Manual extras: preview SL/trailing, cancel monitor, inline Sell buttons, profit logging

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Telegraf, Markup } from "telegraf";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import pino from "pino";

import { getQuote, executeSwap, getCurrentPrice, sellPartial, sellAll } from "./solanaUtils.js";
import User from "./models/User.js"; // existing User model
import ChannelSettings from "./models/ChannelSettings.js"; // new model for allowed channels

dotenv.config();

// ========= Config =========
const LOG = pino({ level: process.env.LOG_LEVEL || "info" });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RPC_URL = process.env.RPC_URL;
const MONGO_URI = process.env.MONGO_URI;
const FEE_WALLET = process.env.FEE_WALLET;
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "15000", 10);
const CHANNEL_REFRESH_MS = parseInt(process.env.CHANNEL_REFRESH_MS || "300000", 10);

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!MONGO_URI) throw new Error("MONGO_URI is required");
if (!RPC_URL) throw new Error("RPC_URL is required");

const bot = new Telegraf(BOT_TOKEN);
const connection = new Connection(RPC_URL, "confirmed");

// ========= MongoDB =========
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => LOG.info("Connected to MongoDB"))
  .catch((err) => {
    LOG.error(err, "MongoDB Error");
    process.exit(1);
  });

// ========= Models (ManualTrade + ProfitLog) =========
const ManualTradeSchema = new mongoose.Schema(
  {
    telegramId: { type: String, index: true },
    wallet: String,
    mint: String,
    solAmount: Number,
    // snapshot of params used for this manual trade
    params: {
      tp1Percent: Number,
      tp1SellPercent: Number,
      tp2Percent: Number,
      tp2SellPercent: Number,
      tp3Percent: Number,
      tp3SellPercent: Number,
      stopLossPercent: Number,
      // extended trailing settings
      trailingTriggerPercent: Number, // activate trailing after this gain
      trailingDistancePercent: Number, // sell when drop from peak >= this
      trailingPercent: Number, // backward-compat fallback
    },
    status: { type: String, default: "running" }, // running | finished | canceled | error
    entryPrice: Number,
    investedSol: { type: Number, default: 0 },
    realizedSol: { type: Number, default: 0 },
    pnlSol: { type: Number, default: 0 },
    txidBuy: String,
  },
  { timestamps: true }
);

const ManualTrade =
  mongoose.models.ManualTrade || mongoose.model("ManualTrade", ManualTradeSchema, "manual_trades");

const ManualProfitLogSchema = new mongoose.Schema(
  { telegramId: String, mint: String, type: String, realizedSol: Number, txid: String },
  { timestamps: true }
);
const ManualProfitLog =
  mongoose.models.ManualProfitLog || mongoose.model("ManualProfitLog", ManualProfitLogSchema, "manual_profit_logs");

// ========= Dynamic Channel Management =========
let CHANNELS = [];

async function loadChannels() {
  try {
    const doc = await ChannelSettings.findById("global");
    CHANNELS = doc ? doc.channels : [];
    LOG.info({ channels: CHANNELS }, "Loaded allowed channels from DB");
  } catch (err) {
    LOG.error(err, "Failed to load channels from DB");
    CHANNELS = [];
  }
}
await loadChannels();
setInterval(() => loadChannels().catch((err) => LOG.error({ err }, "Periodic channel reload failed")), CHANNEL_REFRESH_MS);

// ========= Utils =========
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function isMapLike(x) { return x && typeof x.get === "function" && typeof x.set === "function"; }
function getProfileForChannel(channelProfiles, channel) {
  if (!channelProfiles) return null;
  if (isMapLike(channelProfiles)) return channelProfiles.get(channel) || null;
  return channelProfiles[channel] || null;
}
function setProfileForChannel(channelProfiles, channel, profile) {
  if (!channelProfiles) return;
  if (isMapLike(channelProfiles)) channelProfiles.set(channel, profile);
  else channelProfiles[channel] = profile;
}
function deleteProfileForChannel(channelProfiles, channel) {
  if (!channelProfiles) return false;
  if (isMapLike(channelProfiles)) { if (channelProfiles.has(channel)) { channelProfiles.delete(channel); return true; } return false; }
  if (channelProfiles[channel]) { delete channelProfiles[channel]; return true; }
  return false;
}
function parseKvArgs(arr) {
  const out = {}; for (const tok of arr) { const m = tok.split("="); if (m.length !== 2) continue; const k=m[0]; const v=parseFloat(m[1]); out[k]=Number.isFinite(v)?v:m[1]; } return out;
}
function clampPct(n) { if (!Number.isFinite(n)) return n; return Math.max(-1000, Math.min(1000, n)); }

// ========= Centralized monitoring =========
// monitored: mint -> { users: Map(telegramId -> { wallet, profile, tpStage, trailingActive, peak }), entryPrices: Map(wallet->price), highest, lastPrice, intervalId }
const monitored = new Map();

async function ensureMonitor(mint) {
  if (monitored.has(mint)) return monitored.get(mint);
  const state = { mint, users: new Map(), entryPrices: new Map(), highest: null, lastPrice: null, intervalId: null };

  const loop = async () => {
    try {
      const price = await getCurrentPrice(mint);
      if (typeof price !== "number" || Number.isNaN(price)) { LOG.warn({ mint, price }, "invalid price from getCurrentPrice"); return; }
      state.lastPrice = price; if (state.highest === null || price > state.highest) state.highest = price;
      for (const [telegramId, info] of Array.from(state.users.entries())) {
        try { await monitorUser(mint, price, telegramId, info, state); } catch (err) { LOG.error({ err, mint, telegramId }, "monitorUser error"); }
      }
      if (state.users.size === 0) { LOG.info({ mint }, "no users left — stopping monitor"); if (state.intervalId) clearInterval(state.intervalId); monitored.delete(mint); }
    } catch (err) { LOG.error({ err, mint }, "monitor loop error"); }
  };

  state.intervalId = setInterval(() => loop().catch((err) => LOG.error({ err, mint }, "monitor loop async error")), POLL_INTERVAL_MS);
  loop().catch((err) => LOG.error({ err, mint }, "initial monitor tick error"));

  monitored.set(mint, state); LOG.info({ mint }, "monitor started"); return state;
}

async function monitorUser(mint, price, telegramId, info, state) {
  const { wallet, profile } = info; const entry = state.entryPrices.get(wallet); if (!entry) return; const change = ((price - entry) / entry) * 100;
  if (typeof info.tpStage === "undefined") info.tpStage = 0;

  // Stop-loss
  if (Number.isFinite(profile.stopLossPercent) && change <= -Math.abs(profile.stopLossPercent)) {
    LOG.info({ telegramId, mint, change }, "stop-loss hit — selling all");
    try { const res = await safeSellAll(wallet, mint, telegramId); await maybeUpdateProfitFromResult(telegramId, mint, res, "final"); } catch (err) { LOG.error({ err, telegramId, mint }, "sellAll failed on stop-loss"); }
    state.users.delete(telegramId); state.entryPrices.delete(wallet);
    await ManualTrade.updateMany({ telegramId, mint, status: "running" }, { $set: { status: "finished" } }).catch(()=>{}); return;
  }

  // TP1
  if (info.tpStage < 1 && Number.isFinite(profile.tp1Percent) && change >= profile.tp1Percent) {
    LOG.info({ telegramId, mint, change }, "TP1 reached — partial sell");
    try { const res = await safeSellPartial(wallet, mint, clampPct(profile.tp1SellPercent ?? 0), telegramId); await maybeUpdateProfitFromResult(telegramId, mint, res, "partial"); } catch (err) { LOG.error({ err, telegramId, mint }, "sellPartial TP1 failed"); }
    profile.stopLossPercent = 0; info.tpStage = 1;
    if (Number.isFinite(profile.trailingDistancePercent) && !info.trailingActive && (profile.trailingTriggerPercent ?? 0) <= 0) { info.trailingActive = true; info.peak = price; }
    return;
  }

  // TP2
  if (info.tpStage < 2 && Number.isFinite(profile.tp2Percent) && change >= profile.tp2Percent) {
    LOG.info({ telegramId, mint, change }, "TP2 reached — partial sell");
    try { const res = await safeSellPartial(wallet, mint, clampPct(profile.tp2SellPercent ?? 0), telegramId); await maybeUpdateProfitFromResult(telegramId, mint, res, "partial"); } catch (err) { LOG.error({ err, telegramId, mint }, "sellPartial TP2 failed"); }
    if (Number.isFinite(profile.tp2Percent)) profile.stopLossPercent = profile.tp2Percent; info.tpStage = 2; return;
  }

  // TP3
  if (info.tpStage < 3 && Number.isFinite(profile.tp3Percent) && change >= profile.tp3Percent) {
    LOG.info({ telegramId, mint, change }, "TP3 reached — sell all");
    try { const res = await safeSellAll(wallet, mint, telegramId); await maybeUpdateProfitFromResult(telegramId, mint, res, "final"); } catch (err) { LOG.error({ err, telegramId, mint }, "sellAll TP3 failed"); }
    state.users.delete(telegramId); state.entryPrices.delete(wallet);
    await ManualTrade.updateMany({ telegramId, mint, status: "running" }, { $set: { status: "finished" } }).catch(()=>{}); return;
  }

  // Trailing — Mode A: trigger + distance (per-user peak)
  if (Number.isFinite(profile.trailingDistancePercent)) {
    if (!info.trailingActive) {
      const trig = clampPct(profile.trailingTriggerPercent ?? 0);
      if (change >= Math.abs(trig)) { info.trailingActive = true; info.peak = Math.max(info.peak || price, price); LOG.info({ telegramId, mint, trig }, "trailing activated (distance mode)"); }
    } else {
      if (price > (info.peak || price)) info.peak = price;
      const drop = ((info.peak - price) / info.peak) * 100;
      if (drop >= Math.abs(profile.trailingDistancePercent)) {
        LOG.info({ telegramId, mint, drop }, "trailing distance hit — sell all");
        try { const res = await safeSellAll(wallet, mint, telegramId); await maybeUpdateProfitFromResult(telegramId, mint, res, "final"); } catch (err) { LOG.error({ err, telegramId, mint }, "sellAll trailing failed"); }
        state.users.delete(telegramId); state.entryPrices.delete(wallet);
        await ManualTrade.updateMany({ telegramId, mint, status: "running" }, { $set: { status: "finished" } }).catch(()=>{}); return;
      }
    }
  } else if (Number.isFinite(profile.trailingPercent)) {
    // Trailing — Mode B: single trailingPercent against session high
    const drop = ((state.highest - price) / state.highest) * 100;
    if (drop >= Math.abs(profile.trailingPercent)) {
      LOG.info({ telegramId, mint, drop }, "trailing stop hit — sell all");
      try { const res = await safeSellAll(wallet, mint, telegramId); await maybeUpdateProfitFromResult(telegramId, mint, res, "final"); } catch (err) { LOG.error({ err, telegramId, mint }, "sellAll trailing failed"); }
      state.users.delete(telegramId); state.entryPrices.delete(wallet);
      await ManualTrade.updateMany({ telegramId, mint, status: "running" }, { $set: { status: "finished" } }).catch(()=>{}); return;
    }
  }
}

// ========= Profit logging =========
async function maybeUpdateProfitFromResult(telegramId, mint, res, type) {
  try {
    if (!telegramId || !mint) return;
    const mt = await ManualTrade.findOne({ telegramId, mint, status: "running" });
    if (!mt) return; // only manual trades tracked
    const outLamports = res?.outLamports || res?.sellOutLamports || 0;
    const realizedSol = outLamports ? outLamports / LAMPORTS_PER_SOL : null;
    if (realizedSol != null) {
      mt.realizedSol = (mt.realizedSol || 0) + realizedSol;
      mt.pnlSol = (mt.realizedSol || 0) - (mt.investedSol || 0);
      await mt.save().catch(()=>{});
      await ManualProfitLog.create({ telegramId, mint, type, realizedSol, txid: res?.txid || null }).catch(()=>{});
    } else {
      await ManualProfitLog.create({ telegramId, mint, type, realizedSol: null, txid: res?.txid || null }).catch(()=>{});
    }
  } catch (e) { LOG.warn({ e }, "profit update failed"); }
}

// ========= Safe wrappers =========
async function safeExecuteSwap(opts, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try { return await executeSwap(opts); }
    catch (err) { LOG.warn({ err, attempt: i + 1, opts: { wallet: opts.wallet, mint: opts.mint } }, "swap failed — retrying"); if (i === retries - 1) throw err; await sleep(1000 * (i + 1)); }
  }
}
async function safeSellPartial(wallet, mint, percent, telegramId, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try { const res = await sellPartial({ wallet, mint, percent }); await maybeUpdateProfitFromResult(telegramId, mint, res, "partial"); return res; }
    catch (err) { LOG.error({ err, wallet, mint, percent, attempt: i + 1, telegramId }, "sellPartial failed"); if (i === retries - 1) throw err; await sleep(1000 * (i + 1)); }
  }
}
async function safeSellAll(wallet, mint, telegramId, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try { const res = await sellAll({ wallet, mint }); await maybeUpdateProfitFromResult(telegramId, mint, res, "final"); return res; }
    catch (err) { LOG.error({ err, wallet, mint, attempt: i + 1, telegramId }, "sellAll failed"); if (i === retries - 1) throw err; await sleep(1000 * (i + 1)); }
  }
}

// ========= Trade execution using per-user per-channel profiles =========
async function executeUserTrade(user, mint, sourceChannel) {
  if (!user || !user.active) return;
  const profiles = user.channelProfiles || {}; const profile = getProfileForChannel(profiles, sourceChannel);
  if (!profile) { LOG.warn({ user: user.telegramId, sourceChannel }, "no profile for channel — skipping"); return; }
  const solAmount = profile.solAmountPerTrade; if (!solAmount || solAmount <= 0) { LOG.warn({ user: user.telegramId }, "invalid sol amount — skipping"); return; }
  LOG.info({ user: user.telegramId, mint, solAmount, sourceChannel }, "executing buy");
  let txid; try { txid = await safeExecuteSwap({ wallet: user.wallet, mint, solAmount, side: "buy", feeWallet: FEE_WALLET }); LOG.info({ txid, user: user.telegramId }, "buy executed"); }
  catch (err) { LOG.error({ err, user: user.telegramId }, "buy failed"); return; }
  let entryPrice = null; try { entryPrice = await getCurrentPrice(mint); } catch (err) { LOG.warn({ err, mint }, "failed to fetch entry price"); }
  const state = await ensureMonitor(mint);
  const telegramKey = String(user.telegramId);
  state.users.set(telegramKey, { wallet: user.wallet, profile: { ...profile }, tpStage: 0 });
  if (entryPrice) state.entryPrices.set(user.wallet, entryPrice);
  if (!state.highest && entryPrice) state.highest = entryPrice;
  LOG.info({ mint, user: user.telegramId }, "user attached to monitor");
}

// ========= MANUAL TRADING =========
function resolveManualProfile(user, overrides = {}) {
  const base = user.manualProfile || {}; const merged = { ...base, ...overrides };
  for (const k of Object.keys(merged)) if (typeof merged[k] === "number") merged[k] = clampPct(merged[k]);
  return merged;
}
async function attachManualMonitor(telegramId, wallet, mint, profile, entryPrice) {
  const state = await ensureMonitor(mint); const tkey = String(telegramId);
  state.users.set(tkey, { wallet, profile: { ...profile }, tpStage: 0, trailingActive: false, peak: null });
  if (entryPrice) state.entryPrices.set(wallet, entryPrice); if (!state.highest && entryPrice) state.highest = entryPrice;
}

// ---- Manual Commands ----
bot.command("manual_help", async (ctx) => {
  ctx.reply([
    "Manual trading:\n",
    "/manual_set <param> <value> — set default (per user)",
    "/manual_buy <MINT> <SOL> [k=v ...] — place a buy and start monitor",
    "   e.g. /manual_buy 7vfCXTkY... 0.2 tp1Percent=20 tp1SellPercent=30 stopLossPercent=15",
    "/manual_preview <MINT> — show current SL/trailing levels",
    "/manual_cancel <MINT> — stop monitoring without selling",
    "/manual_sellall <MINT>",
    "/manual_sellpartial <MINT> <PERCENT>",
    "/manual_status — list recent manual trades",
    "Params: tp1Percent,tp1SellPercent,tp2Percent,tp2SellPercent,tp3Percent,tp3SellPercent,stopLossPercent,trailingTriggerPercent,trailingDistancePercent,trailingPercent (fallback)",
  ].join("\n"));
});

bot.command("manual_set", async (ctx) => {
  const parts = ctx.message.text.split(" ").filter(Boolean);
  if (parts.length !== 3) return ctx.reply("Usage: /manual_set <param> <value>");
  const param = parts[1]; const value = parseFloat(parts[2]);
  const allowed = ["tp1Percent","tp1SellPercent","tp2Percent","tp2SellPercent","tp3Percent","tp3SellPercent","stopLossPercent","trailingTriggerPercent","trailingDistancePercent","trailingPercent","solAmountPerTrade"];
  if (!allowed.includes(param)) return ctx.reply("Unknown param. Allowed: " + allowed.join(","));
  if (Number.isNaN(value)) return ctx.reply("Value must be a number");
  const telegramId = String(ctx.from.id);
  let user = await User.findOne({ telegramId }); if (!user) user = new User({ telegramId, active: true, channelProfiles: {} });
  user.manualProfile = user.manualProfile || {}; user.manualProfile[param] = clampPct(value); await user.save();
  ctx.reply(`✅ Set ${param} = ${value}`);
});

bot.command("manual_buy", async (ctx) => {
  try {
    const parts = ctx.message.text.trim().split(/\s+/);
    if (parts.length < 3) return ctx.reply("Usage: /manual_buy <MINT> <SOL> [k=v ...]");
    const mint = parts[1]; const solAmount = parseFloat(parts[2]);
    if (!Number.isFinite(solAmount) || solAmount <= 0) return ctx.reply("SOL amount must be > 0");
    const kv = parseKvArgs(parts.slice(3));
    const telegramId = String(ctx.from.id);
    let user = await User.findOne({ telegramId }); if (!user) user = new User({ telegramId, active: true, channelProfiles: {} });
    if (!user.wallet) return ctx.reply("⚠️ Register your wallet first: /register <SOL_WALLET_ADDRESS>");
    const profile = resolveManualProfile(user, kv);
    ctx.reply("🛒 Executing manual buy...");
    let txid; try { txid = await safeExecuteSwap({ wallet: user.wallet, mint, solAmount, side: "buy", feeWallet: FEE_WALLET }); }
    catch (err) { LOG.error({ err, telegramId, mint }, "manual buy failed"); return ctx.reply("❌ Buy failed: " + (err?.message || err)); }
    let entryPrice = null; try { entryPrice = await getCurrentPrice(mint); } catch {}
    await ManualTrade.create({ telegramId, wallet: user.wallet, mint, solAmount, investedSol: solAmount, params: profile, status: "running", entryPrice: entryPrice || undefined, txidBuy: txid || undefined }).catch((e) => LOG.warn({ e }, "saving ManualTrade failed"));
    await attachManualMonitor(telegramId, user.wallet, mint, profile, entryPrice);
    ctx.reply(`✅ Buy placed. Monitoring enabled. Tx: ${txid || "<unknown>"}`,
      Markup.inlineKeyboard([[Markup.button.callback("Sell 25%", `msellp:25:${mint}`), Markup.button.callback("Sell 50%", `msellp:50:${mint}`), Markup.button.callback("Sell All", `msella:${mint}`)]]));
  } catch (err) { LOG.error({ err }, "manual_buy error"); ctx.reply("❌ Error: " + (err?.message || err)); }
});

bot.command("manual_preview", async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/); if (parts.length !== 2) return ctx.reply("Usage: /manual_preview <MINT>");
  const mint = parts[1]; const telegramId = String(ctx.from.id); const state = monitored.get(mint); const user = await User.findOne({ telegramId });
  const mt = await ManualTrade.findOne({ telegramId, mint, status: { $in: ["running"] } });
  const entry = state?.entryPrices?.get(user?.wallet) || mt?.entryPrice; if (!entry) return ctx.reply("No entry price found for this mint.");
  let cur = null; try { cur = await getCurrentPrice(mint); } catch {}
  const prof = user?.manualProfile || mt?.params || {};
  const sl = Number.isFinite(prof.stopLossPercent) ? (entry * (1 - Math.abs(prof.stopLossPercent)/100)) : null;
  const trig = Number.isFinite(prof.trailingTriggerPercent) ? prof.trailingTriggerPercent : null;
  const dist = Number.isFinite(prof.trailingDistancePercent) ? prof.trailingDistancePercent : null;
  const lines = [
    `Entry: ${entry}`,
    cur ? `Current: ${cur} (Δ ${(((cur-entry)/entry)*100).toFixed(2)}%)` : null,
    sl!=null ? `Stop-loss triggers ≈ ${sl}` : null,
    (trig!=null && dist!=null) ? `Trailing: activate at +${trig}% then sell on -${dist}% from peak` : (prof.trailingPercent!=null ? `Trailing: sell on -${prof.trailingPercent}% from session high` : null)
  ].filter(Boolean);
  ctx.reply(lines.join("\n"));
});

bot.command("manual_cancel", async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/); if (parts.length !== 2) return ctx.reply("Usage: /manual_cancel <MINT>");
  const mint = parts[1]; const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); const state = monitored.get(mint);
  if (state && user?.wallet) { state.users.delete(telegramId); state.entryPrices.delete(user.wallet); }
  await ManualTrade.updateMany({ telegramId, mint, status: "running" }, { $set: { status: "canceled" } }).catch(()=>{});
  ctx.reply("✅ Monitoring canceled for this mint (no sell executed).");
});

bot.command("manual_sellall", async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/); if (parts.length !== 2) return ctx.reply("Usage: /manual_sellall <MINT>");
  const mint = parts[1]; const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user || !user.wallet) return ctx.reply("⚠️ Register first with /register");
  try { await safeSellAll(user.wallet, mint, telegramId); const state = monitored.get(mint); if (state) { state.users.delete(telegramId); state.entryPrices.delete(user.wallet); }
    await ManualTrade.updateMany({ telegramId, mint, status: "running" }, { $set: { status: "finished" } }).catch(()=>{}); ctx.reply("✅ Sold all and stopped monitoring."); }
  catch (err) { ctx.reply("❌ Sell failed: " + (err?.message || err)); }
});

bot.command("manual_sellpartial", async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/); if (parts.length !== 3) return ctx.reply("Usage: /manual_sellpartial <MINT> <PERCENT>");
  const mint = parts[1]; const percent = parseFloat(parts[2]); const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId });
  if (!user || !user.wallet) return ctx.reply("⚠️ Register first with /register"); if (!Number.isFinite(percent) || percent <= 0) return ctx.reply("Percent must be > 0");
  try { await safeSellPartial(user.wallet, mint, clampPct(percent), telegramId); ctx.reply("✅ Partial sell submitted."); }
  catch (err) { ctx.reply("❌ Partial sell failed: " + (err?.message || err)); }
});

bot.command("manual_status", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const user = await User.findOne({ telegramId });
  const recs = await ManualTrade.find({ telegramId }).sort({ createdAt: -1 }).limit(10);
  const lines = [];
  for (const r of recs) lines.push(`${r.mint} — ${r.status} — amount: ${r.solAmount} SOL — PnL: ${(r.pnlSol||0).toFixed(6)} SOL — tx: ${r.txidBuy || "-"}`);
  if (user && user.manualProfile) lines.push("\nCurrent manual defaults: " + JSON.stringify(user.manualProfile));
  const pl = await ManualProfitLog.find({ telegramId }).sort({ createdAt: -1 }).limit(5);
  if (pl.length) { lines.push("\nRecent partials:"); for (const p of pl) lines.push(` • ${p.mint} ${p.type} => ${p.realizedSol ?? "?"} SOL (tx ${p.txid || "-"})`); }
  ctx.reply(lines.join("\n") || "No manual trades yet.");
});

// Inline button handlers
bot.action(/^msellp:(\d+):(.+)$/, async (ctx) => {
  try {
    const percent = parseFloat(ctx.match[1]); const mint = ctx.match[2]; const telegramId = String(ctx.from.id);
    const user = await User.findOne({ telegramId }); if (!user?.wallet) return ctx.reply("⚠️ Register first with /register");
    await safeSellPartial(user.wallet, mint, clampPct(percent), telegramId); await ctx.answerCbQuery("Partial sell submitted");
  } catch (e) { await ctx.answerCbQuery("Error"); }
});

bot.action(/^msella:(.+)$/, async (ctx) => {
  try {
    const mint = ctx.match[1]; const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user?.wallet) return ctx.reply("⚠️ Register first with /register");
    await safeSellAll(user.wallet, mint, telegramId); const state = monitored.get(mint); if (state) { state.users.delete(telegramId); state.entryPrices.delete(user.wallet); }
    await ctx.answerCbQuery("Sold all");
  } catch (e) { await ctx.answerCbQuery("Error"); }
});

// ========= Telegram commands (existing) =========
bot.start((ctx) => { ctx.reply("Welcome to AutoTrader. Use /register <WALLET> to start. For manual trading, see /manual_help."); });

bot.command("register", async (ctx) => {
  const parts = ctx.message.text.split(" ").filter(Boolean); if (parts.length !== 2) return ctx.reply("Usage: /register <SOL_WALLET_ADDRESS>");
  const wallet = parts[1]; const telegramId = String(ctx.from.id);
  let user = await User.findOne({ telegramId });
  if (!user) { user = new User({ telegramId, wallet, active: true, channelProfiles: {} }); await user.save(); return ctx.reply("✅ Registered. Use /subscribe @channel then /set to configure. Or /manual_help for manual trades."); }
  user.wallet = wallet; user.active = true; await user.save(); ctx.reply("✅ Updated wallet and activated account.");
});

bot.command("subscribe", async (ctx) => {
  const parts = ctx.message.text.split(" ").filter(Boolean); if (parts.length !== 2) return ctx.reply("Usage: /subscribe @channel");
  const raw = parts[1].replace(/^@/, ""); if (!CHANNELS.includes(raw)) return ctx.reply("⚠️ This channel is not configured on the bot.");
  const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user) return ctx.reply("⚠️ Register first with /register");
  if (!user.channelProfiles) user.channelProfiles = {}; const isMap = isMapLike(user.channelProfiles);
  if (isMap) { if (!user.channelProfiles.get(raw)) user.channelProfiles.set(raw, {}); }
  else { if (!user.channelProfiles[raw]) user.channelProfiles[raw] = {}; }
  await user.save(); ctx.reply(`✅ Subscribed to @${raw}. Set params: /set @${raw} param value`);
});

bot.command("unsubscribe", async (ctx) => {
  const parts = ctx.message.text.split(" ").filter(Boolean); if (parts.length !== 2) return ctx.reply("Usage: /unsubscribe @channel");
  const raw = parts[1].replace(/^@/, ""); const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user) return ctx.reply("⚠️ Register first with /register");
  const removed = deleteProfileForChannel(user.channelProfiles, raw); if (removed) { await user.save(); return ctx.reply(`✅ Unsubscribed from @${raw}`); }
  ctx.reply("⚠️ You were not subscribed to that channel.");
});

bot.command("set", async (ctx) => {
  const parts = ctx.message.text.split(" ").filter(Boolean); if (parts.length !== 4) return ctx.reply("Usage: /set @channel param value");
  const raw = parts[1].replace(/^@/, ""); const param = parts[2]; const value = parseFloat(parts[3]);
  const allowed = ["tp1Percent","tp1SellPercent","tp2Percent","tp2SellPercent","tp3Percent","tp3SellPercent","stopLossPercent","trailingPercent","solAmountPerTrade"];
  if (!allowed.includes(param)) return ctx.reply("Unknown param. Allowed: " + allowed.join(",")); if (Number.isNaN(value)) return ctx.reply("Value must be a number");
  const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user) return ctx.reply("⚠️ Register first with /register");
  if (!user.channelProfiles || !(isMapLike(user.channelProfiles) || Object.keys(user.channelProfiles).length >= 0)) return ctx.reply("⚠️ Subscribe to the channel first with /subscribe");
  if (isMapLike(user.channelProfiles)) { const profile = user.channelProfiles.get(raw) || {}; profile[param] = value; user.channelProfiles.set(raw, profile); }
  else { if (!user.channelProfiles[raw]) user.channelProfiles[raw] = {}; user.channelProfiles[raw][param] = value; }
  await user.save(); ctx.reply(`✅ Set ${param} for @${raw} to ${value}`);
});

bot.command("profiles", async (ctx) => {
  const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user) return ctx.reply("⚠️ Register first");
  const entries = []; if (user.channelProfiles) { if (isMapLike(user.channelProfiles)) { for (const [ch, p] of user.channelProfiles.entries()) entries.push(`@${ch}: ${JSON.stringify(p)}`); } else { for (const ch of Object.keys(user.channelProfiles)) entries.push(`@${ch}: ${JSON.stringify(user.channelProfiles[ch])}`); } }
  if (user.manualProfile) entries.push("<manual>: " + JSON.stringify(user.manualProfile));
  ctx.reply(entries.join("\n") || "No profiles. Use /subscribe @channel or /manual_set");
});

bot.command("deactivate", async (ctx) => { const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user) return ctx.reply("⚠️ Register first"); user.active = false; await user.save(); ctx.reply("✅ Deactivated"); });

bot.command("activate", async (ctx) => { const telegramId = String(ctx.from.id); const user = await User.findOne({ telegramId }); if (!user) return ctx.reply("⚠️ Register first"); user.active = true; await user.save(); ctx.reply("✅ Activated"); });

bot.command("users", async (ctx) => { const caller = String(ctx.from.id); if (!ADMIN_IDS.includes(caller)) return ctx.reply("Unauthorized"); const users = await User.find({}); const out = users.map((u) => `${u.telegramId} - ${u.wallet} active:${u.active}`).slice(0, 50); ctx.reply(out.join("\n") || "No users"); });

// ========= Admin channel management =========
bot.command("admin_addchannel", async (ctx) => {
  const caller = String(ctx.from.id); if (!ADMIN_IDS.includes(caller)) return ctx.reply("🚫 Unauthorized");
  const parts = ctx.message.text.split(" ").filter(Boolean); if (parts.length !== 2) return ctx.reply("Usage: /admin_addchannel @channel");
  const raw = parts[1].replace(/^@/, ""); let doc = await ChannelSettings.findById("global"); if (!doc) doc = new ChannelSettings({ _id: "global", channels: [] });
  if (doc.channels.includes(raw)) return ctx.reply("⚠️ Channel already exists."); doc.channels.push(raw); await doc.save(); await loadChannels(); ctx.reply(`✅ Added @${raw} to allowed channels.`);
});

bot.command("admin_removechannel", async (ctx) => {
  const caller = String(ctx.from.id); if (!ADMIN_IDS.includes(caller)) return ctx.reply("🚫 Unauthorized");
  const parts = ctx.message.text.split(" ").filter(Boolean); if (parts.length !== 2) return ctx.reply("Usage: /admin_removechannel @channel");
  const raw = parts[1].replace(/^@/, ""); const doc = await ChannelSettings.findById("global"); if (!doc) return ctx.reply("⚠️ No channels configured yet.");
  doc.channels = doc.channels.filter((c) => c !== raw); await doc.save(); await loadChannels(); ctx.reply(`✅ Removed @${raw} from allowed channels.`);
});

bot.command("admin_channels", async (ctx) => {
  const caller = String(ctx.from.id); if (!ADMIN_IDS.includes(caller)) return ctx.reply("🚫 Unauthorized");
  const doc = await ChannelSettings.findById("global"); const list = doc?.channels?.length ? doc.channels.map(c => "@" + c).join(", ") : "No channels configured."; ctx.reply("📢 Current allowed channels: " + list);
});

// ========= Signal handler: supports multiple channels =========
bot.on("message", async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text) return;
    let chatUser = null;
    if (ctx.message.sender_chat && ctx.message.sender_chat.username) chatUser = ctx.message.sender_chat.username;
    else if (ctx.chat && ctx.chat.username) chatUser = ctx.chat.username;
    else if (ctx.chat && ctx.chat.title) chatUser = ctx.chat.title; else return;
    const cleaned = chatUser.replace(/^@/, ""); if (!CHANNELS.includes(cleaned)) return;
    const text = ctx.message.text;
    const mintMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/); if (!mintMatch) return; const mint = mintMatch[0];
    LOG.info({ mint, from: cleaned }, "signal detected");
    const query = { active: true }; query[`channelProfiles.${cleaned}`] = { $exists: true };
    const users = await User.find(query); if (!users || users.length === 0) { LOG.info({ mint, channel: cleaned }, "no subscribers"); return; }
    for (const user of users) executeUserTrade(user, mint, cleaned).catch((err) => LOG.error({ err, user: user.telegramId }, "executeUserTrade error"));
  } catch (err) { LOG.error({ err }, "message handler error"); }
});

// ========= Start bot =========
bot.launch().then(() => LOG.info("Bot launched"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// ========= Exports for testing =========
export default { bot, ensureMonitor, monitored };
