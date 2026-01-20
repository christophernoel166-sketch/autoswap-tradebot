
// autotrader-wallet-mode.js
// Rewritten for FULL WALLET MODE (no per-user Telegram identity)




import dotenv from "dotenv";
import mongoose from "mongoose";
import { Telegraf } from "telegraf";
import { Connection } from "@solana/web3.js";
import pino from "pino";

// Ensure fetch exists in Node <18 (optional)
import nodeFetch from "node-fetch";
if (typeof global.fetch !== "function") global.fetch = nodeFetch;

import { getQuote, executeSwap, getCurrentPrice, sellPartial, sellAll } from "./solanaUtils.js";
import User from "./models/User.js";
import bot from "./src/telegram/bot.js";

import ChannelSettings from "./models/ChannelSettings.js";
import SignalChannel from "./models/SignalChannel.js";
import ProcessedSignal from "./models/ProcessedSignal.js";



// bot.on("channel_post", async (ctx, next) => {
  // console.log("🧪 RAW CHANNEL POST RECEIVED:", ctx.channelPost?.text);
  // return next(); // 🔥 REQUIRED
// });



function isUserApprovedForChannel(user, channelId) {
  if (!Array.isArray(user.subscribedChannels)) return false;

  const sub = user.subscribedChannels.find(
    c => c.channelId === channelId
  );

  return (
    sub &&
    sub.enabled === true &&
    sub.status === "approved"
  );
}



dotenv.config();

function isChannelEnabledForUser(user, channelId) {
  if (!Array.isArray(user.subscribedChannels)) return false;
  return user.subscribedChannels.some(
    (c) => c.channelId === channelId && c.enabled === true
  );
}


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

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!MONGO_URI) throw new Error("MONGO_URI is required");
if (!RPC_URL) throw new Error("RPC_URL is required");


const connection = new Connection(RPC_URL, "confirmed");

// ===================================================
// ✅ AUTO CHANNEL DISCOVERY (my_chat_member)
// ===================================================
bot.on("my_chat_member", async (ctx) => {
  try {
    const update = ctx.update.my_chat_member;
    const chat = update.chat;

    // Only channels matter
    if (chat.type !== "channel") return;

    const status = update.new_chat_member.status;

   // Bot added to channel

if (status === "administrator" || status === "member") {

  await SignalChannel.findOneAndUpdate(
    { channelId: String(chat.id) },
    {
      channelId: String(chat.id),
      title: chat.title || "Unnamed Channel",
      username: chat.username || null,
      status: "active",
      connectedAt: new Date(),
    },
    { upsert: true }
  );

  LOG.info(
    { channelId: chat.id, title: chat.title },
    "Channel auto-connected via admin add"
  );
}

    // Bot removed from channel
    if (status === "left") {
      await SignalChannel.updateOne(
        { channelId: String(chat.id) },
        { $set: { status: "inactive" } }
      );

      LOG.warn(
        { channelId: chat.id, title: chat.title },
        "Channel disconnected (bot removed)"
      );
    }
  } catch (err) {
    LOG.error(err, "my_chat_member handler failed");
  }
});


// ===================================================
// 🔐 CLAIM CHANNEL (owner verification)
// Usage inside channel:
// /claim_channel WALLET_ADDRESS
// ===================================================
bot.on("channel_post", async (ctx) => {
  try {
    const text = ctx.channelPost?.text;
    if (!text?.startsWith("/claim_channel")) return;

    const chat = ctx.chat;
    const walletAddress = text.split(" ")[1];

    if (!walletAddress) {
      return ctx.telegram.sendMessage(
        chat.id,
        "❌ Usage: /claim_channel <WALLET_ADDRESS>"
      );
    }

    const botMember = await ctx.telegram.getChatMember(
      chat.id,
      ctx.botInfo.id
    );

    if (botMember.status !== "administrator") {
      return ctx.telegram.sendMessage(
        chat.id,
        "❌ Bot must be an admin to claim this channel."
      );
    }

    const channel = await SignalChannel.findOne({
      channelId: String(chat.id),
    });

    if (!channel) {
      return ctx.telegram.sendMessage(
        chat.id,
        "❌ Channel not registered. Add bot as admin first."
      );
    }

    if (channel.ownerWallet) {
      return ctx.telegram.sendMessage(
        chat.id,
        `⚠️ Channel already claimed\nOwner: ${channel.ownerWallet}`
      );
    }

    channel.ownerWallet = walletAddress;
    channel.claimedAt = new Date();
    await channel.save();

    ctx.telegram.sendMessage(
      chat.id,
      `✅ Channel claimed successfully\n\nChannel: ${chat.title}\nOwner wallet: ${walletAddress}`
    );
  } catch (err) {
    console.error("claim_channel error:", err);
  }
});


// ===================================================
// 🔐 CHANNEL APPROVAL HANDLER (CHANNEL POSTS ONLY)
// ===================================================
bot.on("channel_post", async (ctx) => {
  try {
    const text = ctx.channelPost?.text?.trim();
    const chat = ctx.chat;

    if (!chat || !text) return;

    const channelId = String(chat.id);

    // ===============================
    // APPROVE WALLET
    // ===============================
    if (text.startsWith("/approve_wallet")) {
      const walletAddress = text.split(" ")[1];

      if (!walletAddress) {
        await ctx.telegram.sendMessage(
          channelId,
          "❌ Usage: /approve_wallet <WALLET_ADDRESS>"
        );
        return;
      }

      LOG.info("🧪 APPROVAL START", { walletAddress, channelId });

      const result = await User.updateOne(
        {
          walletAddress,
          "subscribedChannels.channelId": channelId,
        },
        {
          $set: {
            "subscribedChannels.$.status": "approved",
            "subscribedChannels.$.enabled": true,
            "subscribedChannels.$.approvedAt": new Date(),
          },
        }
      );

      LOG.info("🧪 APPROVAL UPDATE RESULT", result);

      if (result.modifiedCount === 0) {
        await ctx.telegram.sendMessage(
          channelId,
          "❌ Wallet did not request this channel."
        );
        return;
      }

      await ctx.telegram.sendMessage(
        channelId,
        `✅ Wallet approved:\n${walletAddress}`
      );

      return;
    }

    // ===============================
    // REJECT WALLET
    // ===============================
    if (text.startsWith("/reject_wallet")) {
      const walletAddress = text.split(" ")[1];

      if (!walletAddress) {
        await ctx.telegram.sendMessage(
          channelId,
          "❌ Usage: /reject_wallet <WALLET_ADDRESS>"
        );
        return;
      }

      await User.updateOne(
        {
          walletAddress,
          "subscribedChannels.channelId": channelId,
        },
        {
          $set: {
            "subscribedChannels.$.status": "rejected",
            "subscribedChannels.$.enabled": false,
          },
        }
      );

      await ctx.telegram.sendMessage(
        channelId,
        `🚫 Wallet rejected:\n${walletAddress}`
      );

      return;
    }
  } catch (err) {
    LOG.error(err, "❌ channel approve/reject error");
  }
});


// ===================================================
// 🔗 LINK TELEGRAM ↔ WALLET
// Usage (private chat):
// /link_wallet <CODE>
// ===================================================
bot.command("link_wallet", async (ctx) => {
  try {
    // Must be private chat
    if (ctx.chat.type !== "private") {
      return ctx.reply("❌ Please DM me to link your wallet.");
    }

    const args = ctx.message.text.split(" ").slice(1);
    const code = args[0];

    if (!code) {
      return ctx.reply("❌ Usage: /link_wallet <CODE>");
    }

    console.log("🔗 link_wallet received:", code);

    const user = await User.findOne({
      "telegram.linkCode": code,
      "telegram.linkedAt": null,
    });

    if (!user) {
      return ctx.reply("❌ Invalid or expired link code.");
    }

    // 🔒 GLOBAL ONE TELEGRAM → ONE WALLET LOCK
    const existing = await User.findOne({
      "telegram.userId": String(ctx.from.id),
      walletAddress: { $ne: user.walletAddress },
    });

    if (existing) {
      return ctx.reply(
        "❌ This Telegram account is already linked to another wallet."
      );
    }

    user.telegram = {
      userId: String(ctx.from.id),
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      linkedAt: new Date(),
      linkCode: null,
    };

    await user.save();

    await ctx.reply(
      `✅ Wallet linked successfully!\n\n` +
      `💼 Wallet: ${user.walletAddress}\n` +
      `👤 Telegram: @${ctx.from.username || "no_username"}`
    );
  } catch (err) {
    console.error("link_wallet error:", err);
    ctx.reply("❌ Failed to link wallet.");
  }
});


// ========= Dynamic Channel Management =========
let CHANNELS = [];

async function loadChannels() {
  try {
    const rows = await SignalChannel.find({
      status: "active",
    }).lean();

    CHANNELS = rows.map((c) => String(c.channelId));

    LOG.info(
      { channels: CHANNELS },
      "Loaded allowed channels from DB"
    );
  } catch (err) {
    LOG.error(err, "Failed to load channels from DB");
    CHANNELS = [];
  }
}


// ========= Subscription Watcher (STEP 3A — ACTUALLY FINAL) =========
let subscriptionPollRunning = false;

async function pollPendingSubscriptions() {
  if (subscriptionPollRunning) return;
  subscriptionPollRunning = true;

  try {
    const users = await User.find({
      subscribedChannels: {
        $elemMatch: {
          status: "pending",
          $or: [
            { notifiedAt: { $exists: false } },
            { notifiedAt: null },
          ],
        },
      },
    }).lean();

    for (const user of users) {
      for (const sub of user.subscribedChannels) {
        if (sub.status !== "pending") continue;
        if (sub.notifiedAt) continue; // in-memory gate

        // 🔒 ATOMIC ARRAY GATE — SAME ELEMENT ONLY
        const result = await User.updateOne(
          { walletAddress: user.walletAddress },
          {
            $set: {
              "subscribedChannels.$[s].notifiedAt": new Date(),
            },
          },
          {
            arrayFilters: [
              {
                "s.channelId": sub.channelId,
                "s.status": "pending",
                $or: [
                  { "s.notifiedAt": { $exists: false } },
                  { "s.notifiedAt": null },
                ],
              },
            ],
          }
        );

        // Already notified or race condition
        if (result.modifiedCount === 0) {
          continue;
        }

        try {
          LOG.info(
            { wallet: user.walletAddress, channelId: sub.channelId },
            "📩 Sending approval request to channel"
          );

          await sendApprovalRequestToChannel({
            walletAddress: user.walletAddress,
            channelId: sub.channelId,
          });
        } catch (err) {
          LOG.error(
            { err, wallet: user.walletAddress, channelId: sub.channelId },
            "❌ Failed to send approval request"
          );

          // 🔁 Roll back notifiedAt so it retries later
          await User.updateOne(
            { walletAddress: user.walletAddress },
            {
              $unset: {
                "subscribedChannels.$[s].notifiedAt": "",
              },
            },
            {
              arrayFilters: [
                {
                  "s.channelId": sub.channelId,
                },
              ],
            }
          );
        }
      }
    }
  } catch (err) {
    LOG.error({ err }, "❌ pollPendingSubscriptions error");
  } finally {
    subscriptionPollRunning = false;
  }
}


// ========= Approval Request Helper (FIXED — HARD SAFE) =========
function escapeTelegram(text) {
  return String(text).replace(/[<>&]/g, (c) => {
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === "&") return "&amp;";
    return c;
  });
}

async function sendApprovalRequestToChannel({ walletAddress, channelId }) {
  const user = await User.findOne({ walletAddress });

  if (!user) {
    throw new Error("User not found");
  }

  // --------------------------------------------------
  // 🔧 Normalize channel identifier
  // - supports "@xitech101" (dashboard-friendly)
  // - supports numeric channelId fallback
  // --------------------------------------------------
  const normalized = String(channelId).replace(/^@/, "");

  const channel = await SignalChannel.findOne({
    $or: [
      { username: normalized },          // match @xitech101
      { channelId: String(channelId) },  // fallback: numeric ID
    ],
    status: "active",
  });

  if (!channel) {
    throw new Error(
      `Channel not found or inactive for channelId=${channelId}`
    );
  }

  // --------------------------------------------------
  // 🧠 Telegram may not be linked yet — DO NOT BLOCK
  // --------------------------------------------------
  const username = user.telegram?.username
    ? `@${user.telegram.username}`
    : "(not linked yet)";

  const telegramId = user.telegram?.userId
    ? String(user.telegram.userId)
    : "(not linked yet)";

  const safeUsername = escapeTelegram(username);
  const safeTelegramId = escapeTelegram(telegramId);
  const safeWallet = escapeTelegram(walletAddress);

  const message =
    "🆕 Trade Access Request\n\n" +
    "👤 Telegram: " + safeUsername + "\n" +
    "🆔 Telegram ID: " + safeTelegramId + "\n" +
    "💼 Wallet: " + safeWallet + "\n\n" +
    "Approve:\n" +
    "/approve_wallet " + walletAddress + "\n\n" +
    "Reject:\n" +
    "/reject_wallet " + walletAddress;

  // --------------------------------------------------
  // 📩 Send approval request to the Telegram channel
  // --------------------------------------------------
  await bot.telegram.sendMessage(channel.channelId, message);
}


// ========= MongoDB + Bot bootstrap =========
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    LOG.info("Connected to MongoDB");

    await loadChannels();
    LOG.info("Initial channel list loaded");

    // ========= STEP 3B — Start subscription watcher =========
    const SUBSCRIPTION_POLL_MS = parseInt(
      process.env.SUBSCRIPTION_POLL_MS || "10000",
      10
    );

    // initial kick
    pollPendingSubscriptions().catch((err) =>
      LOG.error({ err }, "Initial subscription poll failed")
    );

    // periodic poll
    setInterval(() => {
      pollPendingSubscriptions().catch((err) =>
        LOG.error({ err }, "Periodic subscription poll failed")
      );
    }, SUBSCRIPTION_POLL_MS);


    LOG.info("Launching Telegram bot (wallet-mode)...");

bot.launch({
  allowedUpdates: ["message", "channel_post", "my_chat_member"],
}).catch((err) => {
  LOG.error(err, "Telegram bot launch failed");
});

LOG.info("Telegram bot polling started");


    // ✅ START periodic refresh ONLY AFTER bot is running
    const CHANNEL_REFRESH_MS = parseInt(
      process.env.CHANNEL_REFRESH_MS || "300000",
      10
    );

    setInterval(() => {
      loadChannels().catch((err) =>
        LOG.error({ err }, "Periodic channel reload failed")
      );
    }, CHANNEL_REFRESH_MS);
  })
  .catch((err) => {
    LOG.error(err, "MongoDB Error");
    process.exit(1);
  });



// ========= Utils =========
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function isMapLike(x) {
  return x && typeof x.get === "function" && typeof x.set === "function";
}
function looksLikeMint(s) {
  return typeof s === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

// ===== USER_TOGGLE helpers =====
function isChannelEnabled(user, channelId) {
  if (!Array.isArray(user.subscribedChannels)) return false;

  return user.subscribedChannels.some(
    (c) => c.channelId === channelId && c.enabled === true
  );
}

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
  if (isMapLike(channelProfiles)) {
    if (channelProfiles.has(channel)) {
      channelProfiles.delete(channel);
      return true;
    }
    return false;
  } else {
    if (channelProfiles[channel]) {
      delete channelProfiles[channel];
      return true;
    }
    return false;
  }
}

// ========= DASHBOARD TRADE SAVE HELPER (walletAddress) =========
const BACKEND_BASE =
  process.env.BACKEND_BASE ||
  process.env.VITE_API_BASE ||
  "http://localhost:4000";

async function saveTradeToBackend({
  walletAddress,
  mint,
  solAmount,
  entryPrice,
  exitPrice,
  buyTxid,
  sellTxid,
  sourceChannel,
  reason,
  tradeType = "auto",
}) {
  try {
    const base = BACKEND_BASE.replace(/\/$/, "");
    const endpoint = `${base}/api/trades/record`;

    const payload = {
      walletAddress: String(walletAddress),
      tradeType,
      tokenMint: mint,
      amountSol: solAmount || 0,
      amountToken: 0,
      entryPrice: entryPrice || 0,
      exitPrice: exitPrice || 0,
      buyTxid: buyTxid || null,
      sellTxid: sellTxid || null,
      status: "closed",
      source: "telegram", // source is still channel-originated
      params: { sourceChannel, reason },
      state: {},
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      LOG.error({ status: res.status, body: text, walletAddress, mint }, "saveTradeToBackend failed");
    } else {
      LOG.info({ walletAddress, mint, reason }, "Trade saved to backend");
    }
  } catch (err) {
    LOG.error({ err, walletAddress, mint }, "saveTradeToBackend error");
  }
}

// ========= Centralized monitoring (wallet keyed) =========
const monitored = new Map(); // Map<mint, { users: Map<wallet,info>, entryPrices: Map<wallet,entry>, highest, lastPrice, intervalId }>

async function ensureMonitor(mint) {
  if (monitored.has(mint)) return monitored.get(mint);
  const state = {
    mint,
    users: new Map(),
    entryPrices: new Map(),
    highest: null,
    lastPrice: null,
    intervalId: null,
  };

  const loop = async () => {
    try {
      const price = await getCurrentPrice(mint);
      if (typeof price !== "number" || Number.isNaN(price)) {
        LOG.warn({ mint, price }, "invalid price from getCurrentPrice");
        return;
      }
      state.lastPrice = price;
      if (state.highest === null || price > state.highest) state.highest = price;

      for (const [walletAddress, info] of Array.from(state.users.entries())) {
        try {
          await monitorUser(mint, price, walletAddress, info, state);
        } catch (err) {
          LOG.error({ err, mint, walletAddress }, "monitorUser error");
        }
      }

      if (state.users.size === 0) {
        LOG.info({ mint }, "no users left — stopping monitor");
        if (state.intervalId) clearInterval(state.intervalId);
        monitored.delete(mint);
      }
    } catch (err) {
      LOG.error({ err, mint }, "monitor loop error");
    }
  };

  state.intervalId = setInterval(() => {
    loop().catch((err) => LOG.error({ err, mint }, "monitor loop async error"));
  }, POLL_INTERVAL_MS);

  loop().catch((err) => LOG.error({ err, mint }, "initial monitor tick error"));

  monitored.set(mint, state);
  LOG.info({ mint }, "monitor started");
  return state;
}

async function monitorUser(mint, price, walletAddress, info, state) {
  const { walletAddress: waFromInfo, profile, buyTxid, solAmount, entryPrice: storedEntryPrice, sourceChannel } = info;

  // prefer explicit stored entry price in state.entryPrices, else the entry included in info
  const entry = state.entryPrices.get(walletAddress) ?? storedEntryPrice;
  if (!entry) return;
  const change = ((price - entry) / entry) * 100;

  if (typeof info.tpStage === "undefined") info.tpStage = 0;

  // Stop-loss
  if (change <= -profile.stopLossPercent) {
    LOG.info({ walletAddress, mint, change }, "stop-loss hit — selling all");
    try {
      const sellRes = await safeSellAll(walletAddress, mint);
      const sellTxid = sellRes?.txid || sellRes?.signature || sellRes?.sig || sellRes || null;
      const exitPrice = price;

      await saveTradeToBackend({
        walletAddress,
        mint,
        solAmount,
        entryPrice: entry,
        exitPrice,
        buyTxid,
        sellTxid,
        sourceChannel,
        reason: "stop_loss",
      });
    } catch (err) {
      LOG.error({ err, walletAddress, mint }, "sellAll failed on stop-loss");
    }
    state.users.delete(walletAddress);
    state.entryPrices.delete(walletAddress);
    return;
  }

  // TP1 — partial
  if (info.tpStage < 1 && change >= profile.tp1Percent) {
    LOG.info({ walletAddress, mint, change }, "TP1 reached — partial sell");
    try {
      await safeSellPartial(walletAddress, mint, profile.tp1SellPercent);
    } catch (err) {
      LOG.error({ err, walletAddress, mint }, "sellPartial TP1 failed");
    }
    profile.stopLossPercent = 0;
    info.tpStage = 1;
    return;
  }

  // TP2 — partial
  if (info.tpStage < 2 && change >= profile.tp2Percent) {
    LOG.info({ walletAddress, mint, change }, "TP2 reached — partial sell");
    try {
      await safeSellPartial(walletAddress, mint, profile.tp2SellPercent);
    } catch (err) {
      LOG.error({ err, walletAddress, mint }, "sellPartial TP2 failed");
    }
    profile.stopLossPercent = profile.tp2Percent;
    info.tpStage = 2;
    return;
  }

  // TP3 — sell all
  if (info.tpStage < 3 && change >= profile.tp3Percent) {
    LOG.info({ walletAddress, mint, change }, "TP3 reached — sell all");
    try {
      const sellRes = await safeSellAll(walletAddress, mint);
      const sellTxid = sellRes?.txid || sellRes?.signature || sellRes?.sig || sellRes || null;
      const exitPrice = price;

      await saveTradeToBackend({
        walletAddress,
        mint,
        solAmount,
        entryPrice: entry,
        exitPrice,
        buyTxid,
        sellTxid,
        sourceChannel,
        reason: "tp3",
      });
    } catch (err) {
      LOG.error({ err, walletAddress, mint }, "sellAll TP3 failed");
    }
    state.users.delete(walletAddress);
    state.entryPrices.delete(walletAddress);
    return;
  }

  // Trailing (only after TP1)
  if (info.tpStage >= 1 && state.highest) {
    const drop = ((state.highest - price) / state.highest) * 100;
    if (drop >= profile.trailingPercent) {
      LOG.info({ walletAddress, mint, drop }, "trailing stop hit — sell all");
      try {
        const sellRes = await safeSellAll(walletAddress, mint);
        const sellTxid = sellRes?.txid || sellRes?.signature || sellRes?.sig || sellRes || null;
        const exitPrice = price;

        await saveTradeToBackend({
          walletAddress,
          mint,
          solAmount,
          entryPrice: entry,
          exitPrice,
          buyTxid,
          sellTxid,
          sourceChannel,
          reason: "trailing",
        });
      } catch (err) {
        LOG.error({ err, walletAddress, mint }, "sellAll trailing failed");
      }
      state.users.delete(walletAddress);
      state.entryPrices.delete(walletAddress);
      return;
    }
  }
}

// ========= Safe wrappers =========
async function safeExecuteSwap(opts, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await executeSwap(opts);
    } catch (err) {
      LOG.warn({ err, attempt: i + 1, opts: { wallet: opts.wallet, mint: opts.mint } }, "swap failed — retrying");
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function safeSellPartial(walletAddress, mint, percent, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await sellPartial({ wallet: walletAddress, mint, percent });
    } catch (err) {
      LOG.error({ err, walletAddress, mint, percent, attempt: i + 1 }, "sellPartial failed");
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function safeSellAll(walletAddress, mint, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await sellAll({ wallet: walletAddress, mint });
    } catch (err) {
      LOG.error({ err, walletAddress, mint, attempt: i + 1 }, "sellAll failed");
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

// ========= Trade execution for multi-channel users (wallet-based) =========
async function executeUserTrade(user, mint, sourceChannel) {
  if (!user || user.active === false) return;

 
// 🔒 STEP 3: ENFORCE CHANNEL APPROVAL
// ===================================================
const sub = user.subscribedChannels?.find(
  (s) => String(s.channelId) === String(sourceChannel)
);

if (!sub) {
  LOG.info(
    { wallet: user.walletAddress, channel: sourceChannel },
    "Wallet not subscribed to channel"
  );
  return;
}

if (sub.enabled !== true) {
  LOG.info(
    { wallet: user.walletAddress, channel: sourceChannel },
    "Channel disabled by user"
  );
  return;
}

if (sub.status !== "approved") {
  LOG.warn(
    {
      wallet: user.walletAddress,
      channel: sourceChannel,
      status: sub.status,
    },
    "Trade blocked: wallet not approved by channel owner"
  );
  return;
}

  const solAmount = user.solPerTrade || 0.01;
  if (solAmount <= 0) {
    LOG.warn(`Invalid solPerTrade for user ${user.walletAddress}`);
    return;
  }

  LOG.info({ wallet: user.walletAddress, mint, solAmount, sourceChannel }, "Executing multi-channel BUY");

  let buyTxid;
  try {
    buyTxid = await safeExecuteSwap({
      wallet: user.walletAddress,
      mint,
      solAmount,
      side: "buy",
      feeWallet: FEE_WALLET,
    });
  } catch (err) {
    LOG.error({ err, wallet: user.walletAddress }, "Buy failed");
    return;
  }

  let entryPrice = null;
  try {
    entryPrice = await getCurrentPrice(mint);
  } catch (err) {
    LOG.warn({ err }, "Failed to fetch entry price");
  }

  const state = await ensureMonitor(mint);

  // store user info keyed by walletAddress
  state.users.set(String(user.walletAddress), {
    walletAddress: user.walletAddress,
    tpStage: 0,
    profile: {
      tp1Percent: user.tp1 || 10,
      tp1SellPercent: user.tp1SellPercent || 50,
      tp2Percent: user.tp2 || 20,
      tp2SellPercent: user.tp2SellPercent || 25,
      tp3Percent: user.tp3 || 30,
      tp3SellPercent: user.tp3SellPercent || 25,
      stopLossPercent: user.stopLoss || 6,
      trailingPercent: user.trailingDistance || 5,
    },
    buyTxid,
    solAmount,
    entryPrice,
    sourceChannel,
  });

  if (entryPrice) state.entryPrices.set(user.walletAddress, entryPrice);
  if (!state.highest && entryPrice) state.highest = entryPrice;

  LOG.info({ wallet: user.walletAddress, mint }, "User added to monitor for multi-channel trading");
}

// // ======= Step A: lightweight Express server for bot APIs =======
// import expressModule from "express"; // avoid name clash
// import cors from "cors";

// const app = expressModule();
// app.use(expressModule.json());
// app.use(cors());
//const PORT = Number(process.env.PORT || 8080);




import cors from "cors";
import express from "express";
const app = express();
app.use(express.json());
app.use(cors());

// ===================================================
// 📩 API → BOT: POST CHANNEL APPROVAL REQUEST
// ===================================================
app.post("/bot/request-approval", async (req, res) => {
  try {
    LOG.info("📩 APPROVAL REQUEST RECEIVED", req.body);

    const { walletAddress, channelId } = req.body;

    if (!walletAddress || !channelId) {
      return res.status(400).json({
        error: "walletAddress & channelId required",
      });
    }

    await sendApprovalRequestToChannel({ walletAddress, channelId });

    return res.json({ ok: true });
  } catch (err) {
    LOG.error({ err }, "request-approval error");
    return res.status(500).json({ error: "internal_error" });
  }
});



// health check endpoint
// app.get("/bot-health", (req, res) => {
  // res.json({ ok: true, startedAt: new Date().toISOString() });
// });

// ========= Wallet-based Active Positions API (internal bot API) =========
// app.get("/api/active-positions/wallet/:walletAddress", async (req, res) => {
  // try {
    // const wallet = String(req.params.walletAddress);
    // const user = await User.findOne({ walletAddress: wallet });
    // if (!user) return res.json({ positions: [] });

    // const positions = [];
    // for (const [mint, state] of monitored.entries()) {
      // const info = state.users.get(wallet);
      // if (!info) continue;

      // const entry = info.entryPrice || 0;
      // const current = state.lastPrice || entry;
      // const diffPct = entry > 0 ? (((current - entry) / entry) * 100).toFixed(2) : "0";
      // const solPerTrade = info.solAmount || user.solPerTrade || 0.01;

      // positions.push({
        // mint,
        // entryPrice: entry,
        // currentPrice: current,
        // changePercent: diffPct,
        // pnlSol: ((current - entry) * solPerTrade).toFixed(6),
        // tpStage: info.tpStage,
        // wallet,
      // });
    // }

    // return res.json({ positions });
  // } catch (err) {
    // console.error("active-positions API error:", err);
    // return res.status(500).json({ error: "internal_error" });
  // }
// });


// ================= TEST ENDPOINT — create fake open position =================
// app.post("/test-open", async (req, res) => {
  // try {
    // const { wallet, mint } = req.body;

    // if (!wallet || !mint) {
      // return res.status(400).json({ error: "wallet & mint required" });
    // }

    // Create a fake monitor entry if not existing
    // if (!monitored.has(mint)) {
      // monitored.set(mint, {
        // lastPrice: 0.50,
        // users: new Map(),
        // entryPrices: new Map(),
      // });
    // }

    // const state = monitored.get(mint);

    // const entry = 0.40;
    // const current = 0.50;

    // state.lastPrice = current;

    // state.users.set(wallet, {
      // entryPrice: entry,
      // solAmount: 0.01,
      // tpStage: 1,
    // });

    // state.entryPrices.set(wallet, entry);

    // res.json({
      // ok: true,
      // created: {
        // wallet,
        // mint,
        // entryPrice: entry,
        // currentPrice: current,
        // tpStage: 1,
      // },
    // });
  // } catch (err) {
    // console.error("test-open error:", err);
    // res.status(500).json({ error: "internal_error" });
  // }
// });

// ========= Step C: Manual Sell API (frontend-triggered, wallet-based) =========
// app.post("/api/manual-sell", async (req, res) => {
  // try {
    // const { walletAddress, mint } = req.body;

    // if (!walletAddress || !mint) {
      // return res.status(400).json({ error: "missing_parameters" });
    // }

    // const user = await User.findOne({ walletAddress: String(walletAddress) });
    // if (!user) {
      // return res.status(404).json({ error: "user_not_found" });
    // }

    // const wallet = user.walletAddress;
    // if (!wallet) {
      // return res.status(400).json({ error: "no_wallet_registered" });
    // }

    // Is this token currently being monitored?
    // const state = monitored.get(mint);
    // const info = state?.users?.get(String(wallet));

    // let entryPrice = null;
    // if (info && info.entryPrice) entryPrice = info.entryPrice;

    // Execute 100% sell
    // let sellRes;
    // try {
      // sellRes = await safeSellAll(wallet, mint);
    // } catch (err) {
      // console.error("manual sell error:", err);
      // return res.status(500).json({ error: "sell_failed" });
    // }

    // const sellTxid = sellRes?.txid || sellRes?.signature || sellRes?.sig || sellRes || null;

    // Fetch exit price
    // let exitPrice = 0;
    // try {
      // exitPrice = await getCurrentPrice(mint);
    // } catch {}

    // Save trade to backend DB
    // await saveTradeToBackend({
      // walletAddress: wallet,
      // mint,
      // solAmount: user.solPerTrade || 0.01,
      // entryPrice,
      // exitPrice,
      // buyTxid: null,
      // sellTxid,
      // sourceChannel: "manual_frontend",
      // reason: "manual_sell_web",
      // tradeType: "manual",
    // });

    // Remove from monitoring
    // if (state) {
      // state.users.delete(String(wallet));
      // state.entryPrices.delete(wallet);
    // }

    // return res.json({
      // ok: true,
      // tx: sellTxid,
      // exitPrice,
    // });
  // } catch (err) {
    // console.error("manual-sell API error:", err);
    // return res.status(500).json({ error: "internal_error" });
  // }
// });




// ========= Admin channel management commands via Telegram (keep admin only) =========

bot.command("users", async (ctx) => {
  const caller = String(ctx.from.id);
  if (!ADMIN_IDS.includes(caller)) return ctx.reply("Unauthorized");
  const users = await User.find({});
  const out = users.map((u) => `${u.walletAddress} active:${u.active}`).slice(0, 50);
  ctx.reply(out.join("\n") || "No users");
});

bot.command("admin_addchannel", async (ctx) => {
  const caller = String(ctx.from.id);
  if (!ADMIN_IDS.includes(caller)) return ctx.reply("🚫 Unauthorized");

  const parts = ctx.message.text.split(" ").filter(Boolean);
  if (parts.length !== 2) return ctx.reply("Usage: /admin_addchannel @channel");
  const raw = parts[1].replace(/^@/, "");

  let doc = await ChannelSettings.findById("global");
  if (!doc) doc = new ChannelSettings({ _id: "global", channels: [] });

  if (doc.channels.includes(raw)) return ctx.reply("⚠️ Channel already exists.");

  doc.channels.push(raw);
  await doc.save();
  await loadChannels();
  ctx.reply(`✅ Added @${raw} to allowed channels.`);
});

bot.command("admin_removechannel", async (ctx) => {
  const caller = String(ctx.from.id);
  if (!ADMIN_IDS.includes(caller)) return ctx.reply("🚫 Unauthorized");

  const parts = ctx.message.text.split(" ").filter(Boolean);
  if (parts.length !== 2) return ctx.reply("Usage: /admin_removechannel @channel");
  const raw = parts[1].replace(/^@/, "");

  const doc = await ChannelSettings.findById("global");
  if (!doc) return ctx.reply("⚠️ No channels configured yet.");

  doc.channels = doc.channels.filter((c) => c !== raw);
  await doc.save();
  await loadChannels();
  ctx.reply(`✅ Removed @${raw} from allowed channels.`);
});

bot.command("admin_channels", async (ctx) => {
  const caller = String(ctx.from.id);
  if (!ADMIN_IDS.includes(caller)) return ctx.reply("🚫 Unauthorized");

  const doc = await ChannelSettings.findById("global");
  const list = doc?.channels?.length ? doc.channels.map((c) => "@" + c).join(", ") : "No channels configured.";
  ctx.reply("📢 Current allowed channels: " + list);
});

// ========= Channel self-connect handler (Option 4) =========



    

// ========= Signal handler: supports multiple channels (channel -> mint) =========
bot.on("message", async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text) return;

    let chatUser = null;
    if (ctx.message.sender_chat && ctx.message.sender_chat.username) {
      chatUser = ctx.message.sender_chat.username;
    } else if (ctx.chat && ctx.chat.username) {
      chatUser = ctx.chat.username;
    } else if (ctx.chat && ctx.chat.title) {
      chatUser = ctx.chat.title;
    } else {
      return; // Not a channel message
    }

    const cleaned = chatUser.replace(/^@/, "");

    // Skip if channel isn't allowed
    if (!CHANNELS.includes(cleaned)) {
      LOG.debug({ from: cleaned }, "Channel not allowed");
      return;
    }

    // Extract mint address from message text
    const text = ctx.message.text;
    const mintMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (!mintMatch) return;
    const mint = mintMatch[0];
    if (!looksLikeMint(mint)) return;

    LOG.info({ mint, from: cleaned }, "signal detected");

    // Find users subscribed to this channel (by walletAddress stored in DB)

    const users = await User.find({
  subscribedChannels: {
    $elemMatch: {
      channelId: cleaned,
      enabled: true,   // 👈 USER_TOGGLE enforced here
    },
  },
  active: { $ne: false },
}).lean();


    if (!users || users.length === 0) {
      LOG.warn(`No users subscribed to channel: ${cleaned}`);
      return;
    }

    LOG.info(`Executing trades for ${users.length} subscribed users...`);

    for (const user of users) {
      // user is DB document with walletAddress
      executeUserTrade(user, mint, cleaned).catch((err) =>
        LOG.error({ err, wallet: user.walletAddress }, "executeUserTrade error")
      );
    }
  } catch (err) {
    LOG.error({ err }, "message handler error");
  }
});



process.once("SIGINT", () => {
  bot.stop("SIGINT");
  process.exit(0);
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  process.exit(0);
});


// ========= Named exports (for other modules to import) =========
export { bot, ensureMonitor, monitored, safeSellAll };

export default { bot, ensureMonitor, monitored, safeSellAll };

