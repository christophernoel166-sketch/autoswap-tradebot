 
// autotrader-wallet-mode.js
// Rewritten for FULL WALLET MODE (no per-user Telegram identity)

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Telegraf } from "telegraf";

import pino from "pino";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
// Ensure fetch exists in Node <18 (optional)
import nodeFetch from "node-fetch";
if (typeof global.fetch !== "function") global.fetch = nodeFetch;

import { getQuote, executeSwap, getCurrentPrice, sellPartial, sellAll } from "./solanaUtils.js";
import User from "./models/User.js";
import bot from "./src/telegram/bot.js";
import { restoreTradingWallet } from "./src/services/walletService.js";


import ChannelSettings from "./models/ChannelSettings.js";
import SignalChannel from "./models/SignalChannel.js";
import ProcessedSignal from "./models/ProcessedSignal.js";
import cors from "cors";
import express from "express";
// 🔴 Redis (shared state between bot & API)
import { redis } from "./src/utils/redis.js";
import {
  positionKey,
  walletActiveSet,
  walletPositionsKey, // ✅ add this
  POSITION_FIELDS,
} from "./src/redis/positionKeys.js";



import { manualSellCommandKey } from "./src/redis/commandKeys.js";

redis.ping().then((res) => {
  console.log("🧠 BOT Redis ping:", res);
});




const SIGNAL_TEST_MODE = true; // 🔥 turn OFF after test


// ===================================================
// 🔐 HARD LIVE TEST MODE (STEP 1 — CONFIG ONLY)
// ===================================================
const LIVE_TEST_WALLET = "AyxgDsHe8k8mNfFdVFhE8Ug1LvqEyoKGLo7vV7BUCo3m";
const LIVE_TEST_SOL = 0.001;
const LIVE_TEST_BUY_ONLY = true;


// 🔥 MUST BE HERE
dotenv.config();
const LOG = pino({ level: process.env.LOG_LEVEL || "info" });

// ===================================================
// 🧨 RAW TELEGRAM TAP — MUST LOG ALL COMMANDS
// ===================================================
 bot.on(["message", "channel_post"], async (ctx, next) => {
  const text =
   ctx.channelPost?.text ||
    ctx.message?.text ||
    null;

    console.log("🧨 RAW TAP HIT", {
   updateType: ctx.updateType,
    chatType: ctx.chat?.type,
    chatId: ctx.chat?.id,
    text,
    hasChannelPost: Boolean(ctx.channelPost),
    hasMessage: Boolean(ctx.message),
  });

  return next();
 });


// ===================================================
// 🧭 + 🧪 SINGLE CHANNEL_POST ROUTER
// Commands FIRST, Signals SECOND
// ===================================================
bot.on("channel_post", async (ctx) => {
  try {
    const text = ctx.channelPost?.text?.trim();
    const chat = ctx.chat;
    if (!text || !chat) return;

    const channelId = String(chat.id);

    // ===================================================
    // 🧭 COMMAND ROUTER (ALWAYS FIRST)
    // ===================================================
    if (text.startsWith("/")) {
      const [command, arg] = text.split(/\s+/);

      console.log("🧭 CHANNEL ROUTER HIT", {
        command,
        channelId,
        text,
      });

      // ---------------------------------------------------
      // 📋 /pending_requests
      // ---------------------------------------------------
      if (command === "/pending_requests") {
        const channel = await SignalChannel.findOne({ channelId });
        if (!channel?.ownerWallet) {
          await ctx.telegram.sendMessage(
            channelId,
            "❌ Channel not claimed yet. Use /claim_channel first."
          );
          return;
        }

        const users = await User.find({
          subscribedChannels: {
            $elemMatch: { channelId, status: "pending" },
          },
        }).lean();

        if (!users.length) {
          await ctx.telegram.sendMessage(
            channelId,
            "✅ No pending requests."
          );
          return;
        }

        let msg = "⏳ Pending Wallet Requests:\n\n";
        for (const user of users) {
          const sub = user.subscribedChannels.find(
            (s) => String(s.channelId) === channelId
          );

          msg += `• ${user.walletAddress}\n`;
          msg += `  Requested: ${new Date(
            sub.requestedAt
          ).toLocaleString()}\n\n`;
        }

        await ctx.telegram.sendMessage(channelId, msg);
        return;
      }

      // ---------------------------------------------------
      // 🔐 /claim_channel <WALLET>
      // ---------------------------------------------------
      if (command === "/claim_channel") {
        const walletAddress = arg;
        if (!walletAddress) {
          await ctx.telegram.sendMessage(
            channelId,
            "❌ Usage: /claim_channel <WALLET_ADDRESS>"
          );
          return;
        }

        const botMember = await ctx.telegram.getChatMember(
          chat.id,
          ctx.botInfo.id
        );

        if (botMember.status !== "administrator") {
          await ctx.telegram.sendMessage(
            channelId,
            "❌ Bot must be an admin to claim this channel."
          );
          return;
        }

        const channel = await SignalChannel.findOne({ channelId });
        if (!channel) {
          await ctx.telegram.sendMessage(
            channelId,
            "❌ Channel not registered. Add bot as admin first."
          );
          return;
        }

        if (channel.ownerWallet) {
          await ctx.telegram.sendMessage(
            channelId,
            `⚠️ Channel already claimed\nOwner: ${channel.ownerWallet}`
          );
          return;
        }

        channel.ownerWallet = walletAddress;
        channel.claimedAt = new Date();
        await channel.save();

        await ctx.telegram.sendMessage(
          channelId,
          `✅ Channel claimed successfully\n\nChannel: ${chat.title}\nOwner wallet: ${walletAddress}`
        );

        console.log("🔐 CLAIM SUCCESS", { channelId, walletAddress });
        return;
      }

      // ---------------------------------------------------
      // 🔐 /approve_wallet & /reject_wallet
      // ---------------------------------------------------
      if (command === "/approve_wallet" || command === "/reject_wallet") {
        const walletAddress = arg;
        if (!walletAddress) {
          await ctx.telegram.sendMessage(
            channelId,
            "❌ Usage: /approve_wallet <WALLET_ADDRESS>"
          );
          return;
        }

        const user = await User.findOne({ walletAddress });
        if (!user) {
          await ctx.telegram.sendMessage(
            channelId,
            "❌ Wallet not found in database."
          );
          return;
        }

        const sub = user.subscribedChannels?.find(
          (s) => String(s.channelId) === channelId
        );

        if (!sub) {
          await ctx.telegram.sendMessage(
            channelId,
            "❌ Wallet did not request this channel."
          );
          return;
        }

        if (sub.status !== "pending") {
          await ctx.telegram.sendMessage(
            channelId,
            `❌ Request not pending (current: ${sub.status})`
          );
          return;
        }

        const isApprove = command === "/approve_wallet";

        sub.status = isApprove ? "approved" : "rejected";
        sub.enabled = isApprove;
        sub.approvedAt = new Date();
        await user.save();

        notifyUserOfApproval(user, channelId, isApprove).catch((err) =>
          LOG.error(
            { err, walletAddress, channelId },
            "notifyUserOfApproval failed"
          )
        );

        notifyDashboardOfApproval({
          walletAddress,
          channelId,
          status: isApprove ? "approved" : "rejected",
        }).catch((err) =>
          LOG.error(
            { err, walletAddress, channelId },
            "notifyDashboardOfApproval failed"
          )
        );

        await ctx.telegram.sendMessage(
          channelId,
          isApprove
            ? `✅ Wallet approved:\n${walletAddress}`
            : `🚫 Wallet rejected:\n${walletAddress}`
        );

        console.log("🔐 APPROVAL SUCCESS", {
          walletAddress,
          channelId,
          action: isApprove ? "approved" : "rejected",
        });

        return;
      }

      // Unknown command → ignore
      return;
    }

    // ===================================================
    // 🧪 SIGNAL HANDLER (NON-COMMAND POSTS ONLY)
    // ===================================================
    console.log("🧪 SIGNAL HANDLER HIT (CHANNEL_POST)", {
      channelId,
      chatTitle: chat.title,
      chatUsername: chat.username,
      text,
    });

    const mintMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (!mintMatch) {
      console.log("🧪 NO MINT FOUND IN CHANNEL POST");
      return;
    }

    const mint = mintMatch[0];

    console.log("🧪 MINT DETECTED", {
      mint,
      channel: chat.username || chat.title,
    });

    const users = await User.find({
      active: { $ne: false },
      subscribedChannels: {
        $elemMatch: {
          channelId,
          enabled: true,
          status: "approved",
        },
      },
    }).lean();

    if (!users.length) {
      console.log("🧪 NO ELIGIBLE WALLETS FOR THIS SIGNAL", {
        channelId,
        mint,
      });
      return;
    }

   // LIVE TEST MODE: match by TRADING wallet first (Ayxg...), fallback to main wallet (Gex...)
const testUser = users.find((u) => {
  const main = String(u.walletAddress || "");
  const trading = String(u.tradingWalletPublicKey || "");
  return trading === LIVE_TEST_WALLET || main === LIVE_TEST_WALLET;
});

if (!testUser) {
  console.log("🧪 LIVE TEST WALLET NOT FOUND — SIGNAL IGNORED", {
    liveTestWallet: LIVE_TEST_WALLET,
    eligibleMainWallets: users.map((u) => u.walletAddress),
    eligibleTradingWallets: users.map((u) => u.tradingWalletPublicKey),
  });
  return;
}

console.log("🧪 LIVE TEST USER MATCHED", {
  mainWallet: testUser.walletAddress,
  tradingWallet: testUser.tradingWalletPublicKey,
});


    console.log("🚀 LIVE TEST BUY INITIATED", {
      wallet: testUser.walletAddress,
      mint,
      sol: LIVE_TEST_SOL,
      channelId,
    });

    testUser.solPerTrade = LIVE_TEST_SOL;

    try {
      await executeUserTrade(testUser, mint, channelId);
      console.log("✅ LIVE TEST BUY EXECUTED");
    } catch (err) {
      console.error("❌ LIVE TEST BUY FAILED", err);
    }

    return;
  } catch (err) {
    console.error("❌ channel_post unified handler crashed", err);
  }
});


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





function isChannelEnabledForUser(user, channelId) {
  if (!Array.isArray(user.subscribedChannels)) return false;
  return user.subscribedChannels.some(
    (c) => c.channelId === channelId && c.enabled === true
  );
}


// ========= Config =========
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
if (!FEE_WALLET) throw new Error("FEE_WALLET is required");

// ============================
// 💰 PLATFORM FEES
// ============================
const FEE_BUY_SOL = 0.0025;
const FEE_BUY_LAMPORTS = Math.floor(FEE_BUY_SOL * LAMPORTS_PER_SOL);

// ============================
const FEE_SELL_SOL = 0.0025;
const FEE_SELL_LAMPORTS = Math.floor(FEE_SELL_SOL * LAMPORTS_PER_SOL);

const connection = new Connection(RPC_URL, "confirmed");

// ===================================================
// 💸 BUY FEE HELPER
// ===================================================
async function chargeBuyFee(wallet, buyTxid, mint) {
  try {
    const feePubkey = new PublicKey(FEE_WALLET);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: feePubkey,
        lamports: FEE_BUY_LAMPORTS,
      })
    );

    const sig = await connection.sendTransaction(tx, [wallet], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(sig, "confirmed");

    LOG.info(
      { feeSig: sig, buyTxid, mint, feeLamports: FEE_BUY_LAMPORTS },
      "💸 BUY fee paid"
    );

    return sig;
  } catch (err) {
    LOG.error(
      { errName: err?.name, errMessage: err?.message, mint, buyTxid },
      "❌ BUY fee payment failed"
    );
    return null;
  }
}

// ===================================================
// 💸 SELL FEE HELPER
// ===================================================
async function chargeSellFee(wallet, sellTxid, mint, reason = "sell_fee") {
  try {
    const feePubkey = new PublicKey(FEE_WALLET);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: feePubkey,
        lamports: FEE_SELL_LAMPORTS,
      })
    );

    const sig = await connection.sendTransaction(tx, [wallet], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(sig, "confirmed");

    LOG.info(
      { feeSig: sig, sellTxid, mint, reason, feeLamports: FEE_SELL_LAMPORTS },
      "💸 SELL fee paid"
    );

    return sig;
  } catch (err) {
    // Fee failure should NOT crash selling
    LOG.error(
      { errName: err?.name, errMessage: err?.message, mint, sellTxid, reason },
      "❌ SELL fee payment failed"
    );
    return null;
  }
}

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

// ========= Subscription Watcher (STEP 1.1 — FINAL NON-SPAM) =========
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
    });

    for (const user of users) {
      for (const sub of user.subscribedChannels) {
        if (sub.status !== "pending") continue;
        if (sub.notifiedAt) continue;

        const rawChannelId = String(sub.channelId);   // "@xitech101"
        const normalized = rawChannelId.replace(/^@/, "");

        const result = await User.updateOne(
          {
            walletAddress: user.walletAddress,
            subscribedChannels: {
              $elemMatch: {
                channelId: rawChannelId,
                status: "pending",
                $or: [
                  { notifiedAt: { $exists: false } },
                  { notifiedAt: null },
                ],
              },
            },
          },
          {
            $set: {
              "subscribedChannels.$.notifiedAt": new Date(),
            },
          }
        );

        if (result.modifiedCount === 0) {
          LOG.info(
            { wallet: user.walletAddress, channelId: rawChannelId },
            "⏭️ Skipping — already notified"
          );
          continue;
        }

        try {
          LOG.info(
            { wallet: user.walletAddress, channelId: rawChannelId },
            "📩 Sending approval request to channel"
          );

          await sendApprovalRequestToChannel({
  walletAddress: user.walletAddress,
  channelId: normalized,
});

} catch (err) {
  LOG.error(
    {
      wallet: user.walletAddress,
      rawChannelId,
      normalized,
      errMessage: err?.message,
      tgErrorCode: err?.response?.error_code,
      tgDescription: err?.response?.description,
    },
    "❌ Failed to send approval request"
  );

  // 🔁 Roll back so it retries later
  await User.updateOne(
    {
      walletAddress: user.walletAddress,
      "subscribedChannels.channelId": rawChannelId,
    },
    {
      $unset: {
        "subscribedChannels.$.notifiedAt": "",
      },
    }
  );
}



// ========= Approval Request Helper (FINAL — SAFE + IDENTITY-CONSISTENT) =========
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
      { channelId: String(channelId) },  // fallback numeric ID
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

  LOG.info(
    { walletAddress, channelId: channel.channelId, username: channel.username },
    "📩 Dispatching approval message"
  );

  await bot.telegram.sendMessage(channel.channelId, message);
}

// ===================================================
// 📣 STEP 4 — APPROVAL NOTIFICATIONS + DASHBOARD SYNC
// ===================================================
async function notifyUserOfApproval(user, channelId, isApprove) {
  try {
    if (!user.telegram?.userId) {
      LOG.warn(
        { wallet: user.walletAddress },
        "User not linked to Telegram — skipping DM"
      );
      return;
    }

    const message = isApprove
      ? `✅ Your wallet has been APPROVED for channel ${channelId}`
      : `🚫 Your wallet has been REJECTED for channel ${channelId}`;

    await bot.telegram.sendMessage(user.telegram.userId, message);

    LOG.info(
      {
        wallet: user.walletAddress,
        telegramId: user.telegram.userId,
        channelId,
        action: isApprove ? "approved" : "rejected",
      },
      "📣 Sent approval DM to user"
    );
  } catch (err) {
    LOG.error(
      { err, wallet: user.walletAddress, channelId },
      "❌ Failed to notify user of approval"
    );
  }
}

async function notifyDashboardOfApproval({ walletAddress, channelId, status }) {
  // 🛡️ HARD GUARD — dashboard sync must NEVER crash the bot
  if (!BACKEND_BASE) {
    LOG.warn(
      { walletAddress, channelId, status },
      "⚠️ BACKEND_BASE not set — skipping dashboard approval sync"
    );
    return;
  }

  try {
    const base = BACKEND_BASE.replace(/\/$/, "");
    const endpoint = `${base}/api/channels/approval-event`;

    const payload = {
      walletAddress,
      channelId,
      status, // approved | rejected
      at: new Date().toISOString(),
      source: "telegram",
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      LOG.error(
        { status: res.status, body: text, walletAddress, channelId },
        "Dashboard approval sync failed"
      );
    } else {
      LOG.info(
        { walletAddress, channelId, status },
        "📊 Dashboard approval synced"
      );
    }
  } catch (err) {
    LOG.error(
      { err, walletAddress, channelId },
      "❌ Dashboard approval notify crashed"
    );
  }
}


// ===================================================
// ⏳ STEP 3 — AUTO-EXPIRE PENDING CHANNEL REQUESTS
// ===================================================
const PENDING_EXPIRY_MS = parseInt(
  process.env.PENDING_EXPIRY_MS || String(24 * 60 * 60 * 1000), // default 24h
  10
);

async function expireOldPendingRequests() {
  try {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_MS);

    const result = await User.updateMany(
      {
        "subscribedChannels": {
          $elemMatch: {
            status: "pending",
            requestedAt: { $lt: cutoff },
          },
        },
      },
      {
        $set: {
          "subscribedChannels.$[elem].status": "expired",
          "subscribedChannels.$[elem].enabled": false,
          "subscribedChannels.$[elem].expiredAt": new Date(),
        },
      },
      {
        arrayFilters: [
          {
            "elem.status": "pending",
            "elem.requestedAt": { $lt: cutoff },
          },
        ],
      }
    );

    if (result.modifiedCount > 0) {
      LOG.info(
        {
          expired: result.modifiedCount,
          cutoff: cutoff.toISOString(),
        },
        "⏳ Auto-expired pending channel requests"
      );
    }
  } catch (err) {
    LOG.error(err, "❌ expireOldPendingRequests failed");
  }
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

    // ========= STEP 3 — Auto-expiry scheduler =========
    const EXPIRY_POLL_MS = parseInt(
      process.env.EXPIRY_POLL_MS || "600000", // default: every 10 minutes
      10
    );

    // initial run
    expireOldPendingRequests().catch((err) =>
      LOG.error({ err }, "Initial expiry sweep failed")
    );

    // periodic sweep
    setInterval(() => {
      expireOldPendingRequests().catch((err) =>
        LOG.error({ err }, "Periodic expiry sweep failed")
      );
    }, EXPIRY_POLL_MS);

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
// ========= DASHBOARD TRADE SAVE HELPER (walletAddress) =========
const BACKEND_BASE =
  process.env.BACKEND_BASE ||
  process.env.API_BASE ||          // ✅ this matches Railway
  process.env.BOT_API_BASE ||
  process.env.VITE_API_BASE ||
  `http://127.0.0.1:${process.env.PORT || 8080}`;


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
  const base = BACKEND_BASE.replace(/\/$/, "");
  const endpoint = `${base}/api/trades/record`;

  try {
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
      source: "telegram",
      params: { sourceChannel, reason },
      state: {},
      createdAt: new Date().toISOString(),
    };

   LOG.info({ endpoint, base: BACKEND_BASE }, "🧪 saveTradeToBackend sending");

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

// ✅ ADD THIS (right here)
const text = await res.text().catch(() => "");
LOG.info(
  { endpoint, status: res.status, statusText: res.statusText, body: text },
  "🧪 saveTradeToBackend response"
);

if (!res.ok) {
  LOG.error(
    {
      endpoint,
      status: res.status,
      statusText: res.statusText,
      body: text, // ✅ reuse the same text
      walletAddress,
      mint,
      reason,
      tradeType,
    },
    "saveTradeToBackend failed"
  );
  return;
}


    LOG.info({ walletAddress, mint, reason }, "Trade saved to backend");
  } catch (err) {
    console.error("❌ saveTradeToBackend error (raw)", err);

    LOG.error(
      {
        endpoint,
        base: BACKEND_BASE,
        walletAddress,
        mint,
        reason,
        tradeType,
        errName: err?.name,
        errMessage: err?.message,
        errCode: err?.code,
        errCause: err?.cause?.message,
        errStack: err?.stack,
      },
      "saveTradeToBackend error"
    );
  }
}


// ========= Centralized monitoring (wallet keyed) =========
const monitored = new Map(); // Map<mint, { users: Map<wallet,info>, entryPrices: Map<wallet,entry>, lastPrice, intervalId }>

// ===================================================
// 🔒 REDIS POSITION CLOSE GUARD (ATOMIC)
// Prevents double-sell across bot instances
// ===================================================

async function tryMarkPositionClosing(walletAddress, mint) {
  const key = positionKey(walletAddress, mint);

  while (true) {
    await redis.watch(key);

    const currentStatus = await redis.hget(key, "status");

    if (!currentStatus) {
      await redis.unwatch();
      LOG.warn({ walletAddress, mint }, "Redis position missing");
      return false;
    }

    if (currentStatus !== "open") {
      await redis.unwatch();
      LOG.warn(
        { walletAddress, mint, currentStatus },
        "Position already closing/closed"
      );
      return false;
    }

    const multi = redis.multi();
    multi.hset(key, "status", "closing");

    const result = await multi.exec();

    if (result) {
      LOG.info(
        { walletAddress, mint },
        "🔒 Position atomically marked as closing"
      );
      return true;
    }

    // Retry if transaction failed due to race
  }
}



// ===================================================
// 🔔 REDIS → BOT: MANUAL SELL COMMAND LISTENER
// (after monitored map is initialized)
// ===================================================

// ===================================================
// 🔔 REDIS → BOT: MANUAL SELL COMMAND LISTENER
// (after monitored map is initialized)
// ===================================================

const redisSub = redis.duplicate();

redisSub.subscribe(manualSellCommandKey()).then(() => {
  LOG.info("📡 Subscribed to manual sell Redis channel");
});

redisSub.on("message", async (channel, message) => {
  if (channel !== manualSellCommandKey()) return;

  let walletAddress, mint;

  try {
    const cmd = JSON.parse(message);
    walletAddress = String(cmd.walletAddress || "").trim();
    mint = String(cmd.mint || "").trim();

    if (!walletAddress || !mint) {
      LOG.warn({ message }, "Manual sell ignored — missing walletAddress or mint");
      return;
    }

    LOG.info({ walletAddress, mint }, "🔥 Manual sell command received");

    // 🔒 Verify position still exists in memory
    const state = monitored.get(mint);
    const info = state?.users?.get(walletAddress);

    if (!state || !info) {
      LOG.warn({ walletAddress, mint }, "Manual sell ignored — position not found");
      return;
    }

    // 🔒 Prevent double-sell across bot instances
    const allowed = await tryMarkPositionClosing(walletAddress, mint);
    if (!allowed) return;

    // ✅ Resolve wallet (prefer stored wallet from monitor state)
    let wallet = info.wallet;

    // ✅ Resolve slippageBps (prefer stored slippageBps from monitor state)
    let slippageBps =
      typeof info.slippageBps === "number" ? info.slippageBps : null;

    // Fallback: load user from DB if wallet/slippage missing
    if (!wallet || !slippageBps) {
      const user = await User.findOne({ walletAddress }).lean();
      if (!user) {
        LOG.warn({ walletAddress, mint }, "Manual sell failed — user not found");

        // revert redis status so it can be retried safely
        await redis.hset(positionKey(walletAddress, mint), "status", "open");
        return;
      }

      if (!wallet) {
        wallet = restoreTradingWallet(user);
      }

      if (!slippageBps) {
        const userSlippagePercent =
          typeof user.maxSlippagePercent === "number" ? user.maxSlippagePercent : 2;

        slippageBps = Math.min(
          Math.max(Math.round(userSlippagePercent * 100), 50), // min 0.5%
          2000 // max 20%
        );
      }
    }

    if (!wallet?.publicKey) {
      LOG.error({ walletAddress, mint }, "Manual sell failed — wallet missing/invalid");
      await redis.hset(positionKey(walletAddress, mint), "status", "open");
      return;
    }

    // ---------------------------------------------------
    // Execute FULL sell with retries
    // ---------------------------------------------------
    const traceId = `${walletAddress}:${mint}:manual_sell:${Date.now()}`;
    LOG.info({ traceId, walletAddress, mint, slippageBps }, "🧪 MANUAL SELL TRACE START");

    const sellRes = await safeSellAll(wallet, mint, slippageBps, 2, traceId);

    const sellTxid =
      sellRes?.txid ||
      sellRes?.signature ||
      sellRes?.sig ||
      sellRes ||
      null;

    // 💸 Charge platform SELL fee (every sell action)
    await chargeSellFee(wallet, sellTxid, mint, "manual_sell");

    // ---------------------------------------------------
    // Mark position closed in Redis + cleanup
    // ---------------------------------------------------
    const posKey = positionKey(walletAddress, mint);

    await redis.hset(posKey, "status", "closed");
    await redis.srem(walletPositionsKey(walletAddress), mint);

    // Fetch exit price (best effort)
    let exitPrice = 0;
    try {
      exitPrice = await getCurrentPrice(mint);
    } catch {}

    // Entry price (prefer monitor state entryPrices map)
    const entryPrice =
      state.entryPrices.get(walletAddress) ??
      info.entryPrice ??
      0;

    // Save trade to backend (best effort)
    try {
      await saveTradeToBackend({
        walletAddress,
        mint,
        solAmount: info.solAmount || 0,
        entryPrice: entryPrice || 0,
        exitPrice: exitPrice || 0,
        buyTxid: info.buyTxid || null,
        sellTxid,
        sourceChannel: info.sourceChannel || "manual_redis",
        reason: "manual_sell",
        tradeType: "manual",
      });
    } catch (err) {
      LOG.error({ err, walletAddress, mint }, "Manual sell: saveTradeToBackend failed");
    }

    // Remove from monitoring
    state.users.delete(walletAddress);
    state.entryPrices.delete(walletAddress);

    LOG.info({ walletAddress, mint, sellTxid }, "✅ Manual sell executed");
  } catch (err) {
    LOG.error({ err, walletAddress, mint }, "❌ Manual sell command failed");

    // If we already marked closing, revert to open so it can retry
    if (walletAddress && mint) {
      try {
        await redis.hset(positionKey(walletAddress, mint), "status", "open");
      } catch {}
    }
  }
});

async function ensureMonitor(mint) {
  if (monitored.has(mint)) return monitored.get(mint);
  const state = {
  mint,
  users: new Map(),
  entryPrices: new Map(),

  // ✅ NEW: per-wallet highest
  highestPrices: new Map(), // Map<walletAddress, highestPrice>

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

// ✅ Update highestPrice PER WALLET (not global)
for (const [walletAddress] of state.users.entries()) {
  const prevHigh = state.highestPrices.get(walletAddress);

  if (prevHigh == null || price > prevHigh) {
    state.highestPrices.set(walletAddress, price);

    // 🧪 DEBUG — confirm highest update
    LOG.info(
      { walletAddress, mint, prevHigh, newHigh: price },
      "📈 updated per-wallet highestPrice"
    );
  }
}
     
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
  const {
    profile,
    buyTxid,
    solAmount,
    entryPrice: storedEntryPrice,
    sourceChannel,
    slippageBps, // 🔐 REQUIRED

  } = info;

  const entry = state.entryPrices.get(walletAddress) ?? storedEntryPrice;
  if (!entry) return;

  const change = ((price - entry) / entry) * 100;
  if (typeof info.tpStage === "undefined") info.tpStage = 0;

 /**
 * ===================================================
 * 🔁 INTERNAL HELPER — FINALIZE TRADE (PER-USER WALLET)
 * ===================================================
 */
async function finalizeTrade({ reason, percent = 100 }) {
  let sellRes;
  let exitPrice = price;
  let sellTxid = null;

  try {
    // ===================================================
    // 🔒 GUARD FULL CLOSE ONLY (100%)
    // Prevent double-sell across bot instances
    // ===================================================
    if (percent === 100) {
      const allowed = await tryMarkPositionClosing(walletAddress, mint);
      if (!allowed) {
        LOG.warn(
          { walletAddress, mint },
          "Finalize aborted — already closing/closed"
        );
        return;
      }
    }

    // ===================================================
    // 🔐 USE USER WALLET FROM MONITOR STATE
    // (Stored during BUY registration)
    // ===================================================
    const wallet = info.wallet;

    if (!wallet) {
      LOG.error(
        { walletAddress, mint },
        "❌ Missing wallet in monitor state"
      );

      // Revert Redis status if needed
      if (percent === 100) {
        await redis.hset(
          positionKey(walletAddress, mint),
          "status",
          "open"
        );
      }

      return;
    }

    LOG.info(
      {
        wallet: wallet.publicKey.toBase58(),
        mint,
        percent,
      },
      "🔐 Using user wallet for SELL"
    );

    // ===================================================
// 🚀 EXECUTE SELL FROM USER WALLET
// ===================================================

// ✅ traceId for one sell attempt
const traceId = `${walletAddress}:${mint}:${reason}:${Date.now()}`;

LOG.info({ traceId, walletAddress, mint, reason, percent }, "🧪 SELL TRACE START");

if (percent === 100) {
  sellRes = await safeSellAll(wallet, mint, slippageBps, 2, traceId);
} else {
  sellRes = await safeSellPartial(wallet, mint, percent, slippageBps, 2, traceId);
}


    sellTxid =
  sellRes?.txid ||
  sellRes?.signature ||
  sellRes?.sig ||
  sellRes ||
  null;

// 💸 Charge platform SELL fee (every sell action)
await chargeSellFee(wallet, sellTxid, mint, reason);

  } catch (err) {
    LOG.error(
      { err, walletAddress, mint, reason },
      "❌ Sell execution failed"
    );

    // 🔄 Revert Redis status if full close failed
    if (percent === 100) {
      await redis.hset(
        positionKey(walletAddress, mint),
        "status",
        "open"
      );
    }

    return;
  }

  // ===================================================
  // 🔒 MARK POSITION CLOSED IN REDIS (FULL CLOSE ONLY)
  // ===================================================
  if (percent === 100) {
    const key = positionKey(walletAddress, mint);

    await redis.hset(key, "status", "closed");

    // Remove mint from wallet active set
    await redis.srem(walletPositionsKey(walletAddress), mint);
  }

  // ===================================================
  // 📈 FETCH EXIT PRICE (BEST EFFORT)
  // ===================================================
  try {
    exitPrice = await getCurrentPrice(mint);
  } catch {
    // Ignore failure
  }

  // ===================================================
  // 📦 SAVE TRADE RECORD
  // ===================================================
  await saveTradeToBackend({
    walletAddress,
    mint,
    solAmount,
    entryPrice: entry,
    exitPrice,
    buyTxid,
    sellTxid,
    sourceChannel,
    reason,
  });

  // ===================================================
  // 🧹 CLEANUP IN-MEMORY MONITOR (FULL CLOSE ONLY)
  // ===================================================
  if (percent === 100) {
    state.users.delete(walletAddress);
    state.entryPrices.delete(walletAddress);
    state.highestPrices.delete(walletAddress);
  }

  LOG.info(
    {
      walletAddress,
      mint,
      reason,
      percent,
    },
    "✅ Trade finalized (per-user wallet architecture)"
  );
}

/**
 * ===================================================
 * 🛑 STOP LOSS — SELL ALL
 * ===================================================
 */
if (change <= -profile.stopLossPercent) {
  LOG.info({ walletAddress, mint, change }, "🛑 Stop-loss hit");
  await finalizeTrade({ reason: "stop_loss", percent: 100 });
  return;
}

/**
 * ===================================================
 * 🎯 TP1 — PARTIAL SELL
 * ===================================================
 */
if (info.tpStage < 1 && change >= profile.tp1Percent) {
  LOG.info({ walletAddress, mint, change }, "🎯 TP1 reached");

  await finalizeTrade({
    reason: "tp1",
    percent: profile.tp1SellPercent,
  });

  profile.stopLossPercent = 0;
  info.tpStage = 1;
  return;
}

/**
 * ===================================================
 * 🎯 TP2 — PARTIAL SELL
 * ===================================================
 */
if (info.tpStage < 2 && change >= profile.tp2Percent) {
  LOG.info({ walletAddress, mint, change }, "🎯 TP2 reached");

  await finalizeTrade({
    reason: "tp2",
    percent: profile.tp2SellPercent,
  });

  profile.stopLossPercent = profile.tp2Percent;
  info.tpStage = 2;
  return;
}

/**
 * ===================================================
 * 🎯 TP3 — SELL ALL
 * ===================================================
 */
if (info.tpStage < 3 && change >= profile.tp3Percent) {
  LOG.info({ walletAddress, mint, change }, "🎯 TP3 reached");
  await finalizeTrade({ reason: "tp3", percent: 100 });
  return;
}


// ===================================================
// 🧪 DEBUG — TRAILING STATUS (rate-limited)
// ===================================================
const trailingTriggerPct = Number(profile.trailingPercent || 0);
const walletHigh = state.highestPrices?.get(walletAddress);

info._lastTrailLogAt = info._lastTrailLogAt || 0;
if (Date.now() - info._lastTrailLogAt > 15_000) { // every 15s per position
  info._lastTrailLogAt = Date.now();

  const dropDebug =
    walletHigh != null && walletHigh > 0
      ? ((walletHigh - price) / walletHigh) * 100
      : null;

  LOG.info(
    {
      walletAddress,
      mint,
      tpStage: info.tpStage,
      trailingTriggerPct,
      walletHigh,
      price,
      drop: dropDebug,
      trailingActive: walletHigh != null && trailingTriggerPct > 0,
    },
    "🧪 trailing status"
  );
}

/**
 * ===================================================
 * 📉 TRAILING STOP — SELL ALL (PER WALLET, ACTIVE IMMEDIATELY)
 * ===================================================
 */

// ✅ Trailing disabled if <= 0
if (walletHigh != null && trailingTriggerPct > 0) {
  const drop = ((walletHigh - price) / walletHigh) * 100;

  if (drop >= trailingTriggerPct) {
    LOG.info(
      { walletAddress, mint, drop, walletHigh, price, trailingTriggerPct },
      "📉 Trailing stop hit (per-wallet)"
    );
    await finalizeTrade({ reason: "trailing", percent: 100 });
    return;
  }
}

} // ✅ THIS closes monitorUser


// ========= Safe wrappers =========
async function safeExecuteSwap(
  {
    mint,
    solAmount,
    side,
    feeWallet,
    slippageBps, // 🔐 STEP 3.5 — USER SLIPPAGE WIRED IN
  },
  retries = 3
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await executeSwap({
        wallet: INTERNAL_TRADING_WALLET, // 🔐 backend custody wallet
        mint,
        solAmount,
        side,
        feeWallet,
        slippageBps, // ✅ PASSED THROUGH TO EXECUTION LAYER
      });
    } catch (err) {
      LOG.warn(
        {
          err,
          attempt: i + 1,
          mint,
          solAmount,
          side,
          slippageBps,
        },
        "swap failed — retrying"
      );

      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function safeSellPartial(
  wallet,
  mint,
  percent,
  slippageBps,
  retries = 2,
  traceId = null
) {
  for (let i = 0; i < retries; i++) {
    try {
      LOG.info(
        {
          traceId,
          mint,
          percent,
          slippageBps,
          walletPubkey: wallet?.publicKey?.toBase58?.(),
          hasPublicKey: !!wallet?.publicKey,
          attempt: i + 1,
          retries,
        },
        "🧪 safeSellPartial input"
      );

      // ✅ solanaUtils signature is positional:
      // sellPartial(wallet, mint, percent, slippageBps)
      return await sellPartial(wallet, mint, percent, slippageBps);
    } catch (err) {
      LOG.error(
        {
          traceId,
          errName: err?.name,
          errMessage: err?.message,
          errStack: err?.stack,
          mint,
          percent,
          slippageBps,
          attempt: i + 1,
          retries,
        },
        "sellPartial failed"
      );

      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function safeSellAll(
  wallet,
  mint,
  slippageBps,
  retries = 2,
  traceId = null
) {
  for (let i = 0; i < retries; i++) {
    try {
      LOG.info(
        {
          traceId,
          mint,
          slippageBps,
          walletPubkey: wallet?.publicKey?.toBase58?.(),
          hasPublicKey: !!wallet?.publicKey,
          attempt: i + 1,
          retries,
        },
        "🧪 safeSellAll input"
      );

      // ✅ solanaUtils signature is positional:
      // sellAll(wallet, mint, slippageBps)
      return await sellAll(wallet, mint, slippageBps);
    } catch (err) {
      LOG.error(
        {
          traceId,
          errName: err?.name,
          errMessage: err?.message,
          errStack: err?.stack,
          mint,
          slippageBps,
          attempt: i + 1,
          retries,
        },
        "sellAll failed"
      );

      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}



async function executeUserTrade(user, mint, sourceChannel) {
  if (!user) return;

  try {
    // ===================================================
    // 🔒 Require trading enabled
    // ===================================================
    if (!user.tradingEnabled) {
      LOG.info(
        { wallet: user.walletAddress },
        "⛔ Trade blocked: trading not enabled"
      );
      return;
    }

    // ===================================================
    // 🔒 Channel approval enforcement
    // ===================================================
    const sub = user.subscribedChannels?.find(
      (s) => String(s.channelId) === String(sourceChannel)
    );

    if (!sub || sub.enabled !== true || sub.status !== "approved") {
      LOG.warn(
        {
          wallet: user.walletAddress,
          channel: sourceChannel,
        },
        "⛔ Trade blocked: channel not approved"
      );
      return;
    }

    // ===================================================
    // 🔐 Restore USER trading wallet
    // ===================================================
    const wallet = restoreTradingWallet(user);

    LOG.info(
      {
        user: user.walletAddress,
        tradingWallet: wallet.publicKey.toBase58(),
      },
      "🔐 User trading wallet restored"
    );

    // ===================================================
    // 💰 Resolve SOL amount
    // ===================================================
    const solAmount = user.solPerTrade || 0.01;
    if (solAmount <= 0) {
      LOG.warn(
        { wallet: user.walletAddress },
        "Invalid solPerTrade"
      );
      return;
    }

    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    // ✅ Balance guard: trade amount + fees/rent buffer
const balance = await connection.getBalance(wallet.publicKey, "confirmed");

// Buffer to cover: ATA rent + tx fees
const BUFFER_LAMPORTS = 3_000_000;

// ✅ Include BUY fee
const REQUIRED_LAMPORTS = lamports + BUFFER_LAMPORTS + FEE_BUY_LAMPORTS;

if (balance < REQUIRED_LAMPORTS) {
  LOG.warn(
    {
      tradingWallet: wallet.publicKey.toBase58(),
      balanceLamports: balance,
      requiredLamports: REQUIRED_LAMPORTS,
      tradeLamports: lamports,
      feeLamports: FEE_BUY_LAMPORTS,
      bufferLamports: BUFFER_LAMPORTS,
    },
    "⛔ Skipping BUY: insufficient SOL for trade+fee+buffer"
  );
  return;
}

    // ===================================================
    // 🔐 Slippage (clamped)
    // ===================================================
    const userSlippagePercent =
      typeof user.maxSlippagePercent === "number"
        ? user.maxSlippagePercent
        : 2;

    const slippageBps = Math.min(
      Math.max(Math.round(userSlippagePercent * 100), 50),  // 0.5% min
      2000 // 20% max
    );

    LOG.info(
      {
        wallet: user.walletAddress,
        slippageBps,
      },
      "🔐 Slippage resolved"
    );

    // ===================================================
    // 📊 Get quote
    // ===================================================
    const quote = await getQuote(
      "So11111111111111111111111111111111111111112", // SOL
      mint,
      lamports,
      slippageBps
    );

    if (!quote) {
      LOG.warn(
        { wallet: user.walletAddress },
        "Quote failed"
      );
      return;
    }

    // ===================================================
// 🚀 Execute BUY from USER wallet
// ===================================================
const buyTxid = await executeSwap(wallet, quote);

LOG.info(
  { wallet: user.walletAddress, mint, buyTxid },
  "✅ BUY executed (user wallet)"
);

// 💸 Charge platform BUY fee (INSERT THIS HERE)
await chargeBuyFee(wallet, buyTxid, mint);
    // ===================================================
    // 📈 Determine entry price
    // ===================================================
    let entryPrice = null;
    try {
      entryPrice = await getCurrentPrice(mint);
    } catch {
      LOG.warn(
        { wallet: user.walletAddress, mint },
        "⚠️ Failed to fetch entry price"
      );
    }

    // ===================================================
// 🧠 Write position to Redis
// ===================================================
try {
  const walletKey = walletPositionsKey(user.walletAddress);
  const posKey = positionKey(user.walletAddress, mint);

  await redis.sadd(walletKey, mint);

  await redis.hset(posKey, {
    [POSITION_FIELDS.walletAddress]: user.walletAddress,
    [POSITION_FIELDS.mint]: mint,
    [POSITION_FIELDS.sourceChannel]: sourceChannel,

    [POSITION_FIELDS.solAmount]: String(solAmount),
    [POSITION_FIELDS.entryPrice]: String(entryPrice ?? 0),
    [POSITION_FIELDS.buyTxid]: String(buyTxid),

    [POSITION_FIELDS.tpStage]: "0",
    [POSITION_FIELDS.highestPrice]: String(entryPrice ?? 0),
    status: "open",

    [POSITION_FIELDS.openedAt]: String(Date.now()),
  });

  // ✅ verify the write landed (super important for debugging)
  const status = await redis.hget(posKey, "status");
  LOG.info({ walletKey, posKey, status }, "🧪 Redis verify write (status)");

  LOG.info({ wallet: user.walletAddress, mint }, "🧠 Position written to Redis");
} catch (err) {
  const walletKey = walletPositionsKey(user.walletAddress);
  const posKey = positionKey(user.walletAddress, mint);

  LOG.error(
    {
      redisUrl: process.env.REDIS_URL ? "set" : "missing",
      wallet: user.walletAddress,
      mint,
      walletKey,
      posKey,
      errName: err?.name,
      errMessage: err?.message,
      errCode: err?.code,
      errStack: err?.stack,
    },
    "❌ Failed to write position to Redis"
  );
}


    // ===================================================
    // 📈 Register for monitoring
    // ===================================================
    const state = await ensureMonitor(mint);

    state.users.set(String(user.walletAddress), {
      walletAddress: user.walletAddress,
      wallet,   // 🔥 CRITICAL — store wallet object
      tpStage: 0,
      profile: {
        tp1Percent: user.tp1,
        tp1SellPercent: user.tp1SellPercent,
        tp2Percent: user.tp2,
        tp2SellPercent: user.tp2SellPercent,
        tp3Percent: user.tp3,
        tp3SellPercent: user.tp3SellPercent,
        stopLossPercent: user.stopLoss,
        trailingPercent: user.trailingDistance,
      },
      buyTxid,
      solAmount,
      entryPrice,
      sourceChannel,
      slippageBps,
    });
    
    // ✅ Step 3A: initialize per-wallet highest immediately
if (entryPrice) {
  const wa = String(user.walletAddress);
  const prev = state.highestPrices.get(wa);
  if (prev == null || entryPrice > prev) {
    state.highestPrices.set(wa, entryPrice);
  }
}

    if (entryPrice) {
  state.entryPrices.set(user.walletAddress, entryPrice);
}

    LOG.info(
      { wallet: user.walletAddress, mint },
      "📈 Position registered for monitoring"
    );

  } catch (err) {
    LOG.error(
      { err, wallet: user?.walletAddress },
      "❌ executeUserTrade error"
    );
  }
}


 // ======= Step A: lightweight Express server for bot APIs =======
// import expressModule from "express"; // avoid name clash
// import cors from "cors";

// const app = expressModule();
// app.use(expressModule.json());
// app.use(cors());
//const PORT = Number(process.env.PORT || 8080);




// import cors from "cors";
// import express from "express";
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


process.once("SIGINT", () => {
  bot.stop("SIGINT");
  process.exit(0);
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  process.exit(0);
});


// ========= Named exports (for other modules to import) =========
// export { bot, ensureMonitor, monitored, safeSellAll };

// export default { bot, ensureMonitor, monitored, safeSellAll };

