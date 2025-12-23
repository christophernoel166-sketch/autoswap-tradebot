// autotrader-enhanced.js
// Production-ready Solana AutoTrader with MANUAL trading capabilities

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Telegraf, Markup } from "telegraf";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import pino from "pino";

import { getQuote, executeSwap, getCurrentPrice, sellPartial, sellAll, getTokenBalance } from "./solanaUtils.js";
import User from "./models/User.js";
import ChannelSettings from "./models/ChannelSettings.js";
import TradeHistory from "./models/TradeHistory.js"; // NEW: Trade history model
import ManualPosition from "./models/ManualPosition.js"; // NEW: Manual positions model

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

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!MONGO_URI) throw new Error("MONGO_URI is required");
if (!RPC_URL) throw new Error("RPC_URL is required");

const bot = new Telegraf(BOT_TOKEN);
const connection = new Connection(RPC_URL, "confirmed");

// ========= MongoDB =========
mongoose
  .connect(MONGO_URI)
  .then(() => LOG.info("Connected to MongoDB"))
  .catch((err) => {
    LOG.error(err, "MongoDB Error");
    process.exit(1);
  });

// ========= NEW: Manual Position Management =========
const manualPositions = new Map(); // telegramId -> Array of positions

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

const CHANNEL_REFRESH_MS = parseInt(process.env.CHANNEL_REFRESH_MS || "300000", 10);
setInterval(() => {
  loadChannels().catch((err) => LOG.error({ err }, "Periodic channel reload failed"));
}, CHANNEL_REFRESH_MS);

// ========= NEW: Manual Trading Functions =========

/**
 * Execute manual buy trade
 */
async function executeManualBuy(telegramId, mint, solAmount, customParams = {}) {
  try {
    const user = await User.findOne({ telegramId });
    if (!user || !user.active) {
      throw new Error("User not found or inactive");
    }

    LOG.info({ user: telegramId, mint, solAmount }, "Executing manual buy");

    // Execute swap
    const txid = await safeExecuteSwap({ 
      wallet: user.wallet, 
      mint, 
      solAmount, 
      side: "buy", 
      feeWallet: FEE_WALLET 
    });

    // Get entry price
    const entryPrice = await getCurrentPrice(mint);
    
    // Create position record
    const position = new ManualPosition({
      telegramId,
      wallet: user.wallet,
      mint,
      entryPrice,
      solAmount,
      tokenAmount: await calculateTokenAmount(mint, solAmount),
      status: 'open',
      stopLoss: customParams.stopLoss || null,
      takeProfit: customParams.takeProfit || null,
      trailingStop: customParams.trailingStop || null
    });
    await position.save();

    // Add to trade history
    const trade = new TradeHistory({
      telegramId,
      wallet: user.wallet,
      mint,
      type: 'manual_buy',
      solAmount,
      price: entryPrice,
      txid
    });
    await trade.save();

    // Add to in-memory monitoring if auto-management enabled
    if (customParams.autoManage) {
      await ensureManualPositionMonitor(telegramId, position._id, customParams);
    }

    return { txid, entryPrice, positionId: position._id };
  } catch (error) {
    LOG.error({ error, telegramId, mint }, "Manual buy failed");
    throw error;
  }
}

/**
 * Execute manual sell trade
 */
async function executeManualSell(telegramId, mint, sellPercentage = 100, positionId = null) {
  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      throw new Error("User not found");
    }

    LOG.info({ user: telegramId, mint, sellPercentage }, "Executing manual sell");

    let txid;
    let soldValue;

    if (sellPercentage === 100) {
      // Full sell
      const result = await safeSellAll(user.wallet, mint, telegramId);
      txid = result.txid;
      soldValue = result.solAmount;
    } else {
      // Partial sell
      const result = await safeSellPartial(user.wallet, mint, sellPercentage, telegramId);
      txid = result.txid;
      soldValue = result.solAmount;
    }

    // Update position if positionId provided
    if (positionId) {
      const position = await ManualPosition.findById(positionId);
      if (position) {
        if (sellPercentage === 100) {
          position.status = 'closed';
          position.exitPrice = await getCurrentPrice(mint);
          position.exitDate = new Date();
        } else {
          // Update position size for partial sell
          position.solAmount = position.solAmount * (1 - sellPercentage / 100);
          position.tokenAmount = position.tokenAmount * (1 - sellPercentage / 100);
        }
        await position.save();
      }
    }

    // Add to trade history
    const trade = new TradeHistory({
      telegramId,
      wallet: user.wallet,
      mint,
      type: sellPercentage === 100 ? 'manual_sell_all' : 'manual_sell_partial',
      solAmount: soldValue,
      price: await getCurrentPrice(mint),
      txid,
      sellPercentage
    });
    await trade.save();

    // Remove from monitoring if full sell
    if (sellPercentage === 100 && positionId) {
      removeManualPositionMonitor(telegramId, positionId);
    }

    return { txid, soldValue };
  } catch (error) {
    LOG.error({ error, telegramId, mint }, "Manual sell failed");
    throw error;
  }
}

/**
 * Monitor manual positions for stop-loss/take-profit
 */
async function ensureManualPositionMonitor(telegramId, positionId, params) {
  const monitorKey = `${telegramId}_${positionId}`;
  
  if (manualPositions.has(monitorKey)) {
    return; // Already monitoring
  }

  const monitor = {
    positionId,
    telegramId,
    params,
    intervalId: setInterval(async () => {
      try {
        await checkManualPositionTriggers(telegramId, positionId, params);
      } catch (error) {
        LOG.error({ error, telegramId, positionId }, "Manual position monitor error");
      }
    }, POLL_INTERVAL_MS)
  };

  manualPositions.set(monitorKey, monitor);
  LOG.info({ telegramId, positionId }, "Started manual position monitoring");
}

function removeManualPositionMonitor(telegramId, positionId) {
  const monitorKey = `${telegramId}_${positionId}`;
  const monitor = manualPositions.get(monitorKey);
  if (monitor) {
    clearInterval(monitor.intervalId);
    manualPositions.delete(monitorKey);
    LOG.info({ telegramId, positionId }, "Stopped manual position monitoring");
  }
}

async function checkManualPositionTriggers(telegramId, positionId, params) {
  const position = await ManualPosition.findById(positionId);
  if (!position || position.status !== 'open') {
    removeManualPositionMonitor(telegramId, positionId);
    return;
  }

  const currentPrice = await getCurrentPrice(position.mint);
  const changePercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

  // Check take profit
  if (params.takeProfit && changePercent >= params.takeProfit) {
    LOG.info({ telegramId, positionId, changePercent }, "Manual position take profit triggered");
    await executeManualSell(telegramId, position.mint, 100, positionId);
    await bot.telegram.sendMessage(telegramId, 
      `🎯 Take Profit triggered for ${position.mint}\n` +
      `Profit: ${changePercent.toFixed(2)}%`
    );
    return;
  }

  // Check stop loss
  if (params.stopLoss && changePercent <= -params.stopLoss) {
    LOG.info({ telegramId, positionId, changePercent }, "Manual position stop loss triggered");
    await executeManualSell(telegramId, position.mint, 100, positionId);
    await bot.telegram.sendMessage(telegramId, 
      `🛑 Stop Loss triggered for ${position.mint}\n` +
      `Loss: ${changePercent.toFixed(2)}%`
    );
    return;
  }

  // Update trailing stop
  if (params.trailingStop && changePercent > 0) {
    if (!position.trailingPeak || currentPrice > position.trailingPeak) {
      position.trailingPeak = currentPrice;
      await position.save();
    }

    if (position.trailingPeak) {
      const dropFromPeak = ((position.trailingPeak - currentPrice) / position.trailingPeak) * 100;
      if (dropFromPeak >= params.trailingStop) {
        LOG.info({ telegramId, positionId, dropFromPeak }, "Manual position trailing stop triggered");
        await executeManualSell(telegramId, position.mint, 100, positionId);
        await bot.telegram.sendMessage(telegramId, 
          `📉 Trailing Stop triggered for ${position.mint}\n` +
          `Sold at: ${changePercent.toFixed(2)}% profit`
        );
      }
    }
  }
}

// ========= NEW: Portfolio & Balance Functions =========

/**
 * Get user portfolio summary
 */
async function getPortfolioSummary(telegramId) {
  try {
    const user = await User.findOne({ telegramId });
    if (!user) throw new Error("User not found");

    // Get open positions
    const openPositions = await ManualPosition.find({ 
      telegramId, 
      status: 'open' 
    });

    // Get SOL balance
    const solBalance = await connection.getBalance(new PublicKey(user.wallet));
    const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;

    // Calculate portfolio value
    let totalInvested = 0;
    let currentValue = solBalanceFormatted;
    const positionDetails = [];

    for (const position of openPositions) {
      const currentPrice = await getCurrentPrice(position.mint);
      const positionValue = position.tokenAmount * currentPrice;
      const pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      
      totalInvested += position.solAmount;
      currentValue += positionValue;

      positionDetails.push({
        mint: position.mint,
        invested: position.solAmount,
        currentValue: positionValue,
        pnl: pnl,
        entryPrice: position.entryPrice,
        currentPrice: currentPrice
      });
    }

    const totalPnl = ((currentValue - totalInvested) / totalInvested) * 100;

    return {
      solBalance: solBalanceFormatted,
      totalInvested,
      currentValue,
      totalPnl,
      positions: positionDetails,
      openPositionsCount: openPositions.length
    };
  } catch (error) {
    LOG.error({ error, telegramId }, "Portfolio summary error");
    throw error;
  }
}

/**
 * Get trade history
 */
async function getTradeHistory(telegramId, limit = 10) {
  try {
    const trades = await TradeHistory.find({ telegramId })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return trades;
  } catch (error) {
    LOG.error({ error, telegramId }, "Trade history error");
    throw error;
  }
}

/**
 * Get token balance for specific mint
 */
async function getTokenBalanceForMint(telegramId, mint) {
  try {
    const user = await User.findOne({ telegramId });
    if (!user) throw new Error("User not found");

    const balance = await getTokenBalance(user.wallet, mint);
    return balance;
  } catch (error) {
    LOG.error({ error, telegramId, mint }, "Token balance error");
    throw error;
  }
}

// ========= NEW: Manual Trading Commands =========

bot.command("buy", async (ctx) => {
  try {
    const parts = ctx.message.text.split(" ").filter(Boolean);
    if (parts.length < 3) {
      return ctx.reply(
        "Usage: /buy <mint> <sol_amount> [stop_loss%] [take_profit%] [trailing_stop%]\n\n" +
        "Examples:\n" +
        "/buy Aabc123... 0.1\n" +
        "/buy Aabc123... 0.1 10 20 5\n" +
        "/buy Aabc123... 0.1 15 0 0 (stop-loss only)"
      );
    }

    const mint = parts[1];
    const solAmount = parseFloat(parts[2]);
    const stopLoss = parts[3] ? parseFloat(parts[3]) : null;
    const takeProfit = parts[4] ? parseFloat(parts[4]) : null;
    const trailingStop = parts[5] ? parseFloat(parts[5]) : null;

    if (!solAmount || solAmount <= 0) {
      return ctx.reply("❌ Invalid SOL amount");
    }

    const customParams = {
      stopLoss,
      takeProfit,
      trailingStop,
      autoManage: !!(stopLoss || takeProfit || trailingStop)
    };

    ctx.reply("🔄 Executing manual buy...");

    const result = await executeManualBuy(String(ctx.from.id), mint, solAmount, customParams);

    let message = `✅ Manual Buy Executed!\n\n` +
                 `Mint: ${mint.slice(0, 8)}...\n` +
                 `Amount: ${solAmount} SOL\n` +
                 `Entry: $${result.entryPrice.toFixed(6)}\n` +
                 `TX: ${result.txid.slice(0, 16)}...`;

    if (customParams.autoManage) {
      message += `\n\n🛡️ Auto-management enabled:`;
      if (stopLoss) message += `\nStop Loss: ${stopLoss}%`;
      if (takeProfit) message += `\nTake Profit: ${takeProfit}%`;
      if (trailingStop) message += `\nTrailing Stop: ${trailingStop}%`;
    }

    ctx.reply(message);

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "Manual buy command failed");
    ctx.reply(`❌ Buy failed: ${error.message}`);
  }
});

bot.command("sell", async (ctx) => {
  try {
    const parts = ctx.message.text.split(" ").filter(Boolean);
    if (parts.length < 2) {
      return ctx.reply(
        "Usage: /sell <mint> [percentage]\n\n" +
        "Examples:\n" +
        "/sell Aabc123... (sells 100%)\n" +
        "/sell Aabc123... 50 (sells 50%)\n" +
        "/sell Aabc123... 25 (sells 25%)"
      );
    }

    const mint = parts[1];
    const percentage = parts[2] ? parseFloat(parts[2]) : 100;

    if (percentage <= 0 || percentage > 100) {
      return ctx.reply("❌ Percentage must be between 1-100");
    }

    ctx.reply("🔄 Executing manual sell...");

    const result = await executeManualSell(String(ctx.from.id), mint, percentage);

    const action = percentage === 100 ? "fully sold" : `${percentage}% sold`;
    ctx.reply(
      `✅ Position ${action}!\n\n` +
      `Mint: ${mint.slice(0, 8)}...\n` +
      `TX: ${result.txid.slice(0, 16)}...`
    );

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "Manual sell command failed");
    ctx.reply(`❌ Sell failed: ${error.message}`);
  }
});

bot.command("portfolio", async (ctx) => {
  try {
    ctx.reply("🔄 Fetching portfolio...");

    const portfolio = await getPortfolioSummary(String(ctx.from.id));

    let message = `📊 Portfolio Summary\n\n` +
                 `💰 SOL Balance: ${portfolio.solBalance.toFixed(4)} SOL\n` +
                 `📈 Total Invested: ${portfolio.totalInvested.toFixed(4)} SOL\n` +
                 `🏦 Current Value: ${portfolio.currentValue.toFixed(4)} SOL\n` +
                 `📊 Total P&L: ${portfolio.totalPnl.toFixed(2)}%\n\n` +
                 `📂 Open Positions: ${portfolio.openPositionsCount}\n\n`;

    if (portfolio.positions.length > 0) {
      message += `🔍 Position Details:\n`;
      portfolio.positions.forEach((pos, index) => {
        message += `\n${index + 1}. ${pos.mint.slice(0, 8)}...\n` +
                  `   Invested: ${pos.invested.toFixed(4)} SOL\n` +
                  `   Current: ${pos.currentValue.toFixed(4)} SOL\n` +
                  `   P&L: ${pos.pnl.toFixed(2)}%\n` +
                  `   Entry: $${pos.entryPrice.toFixed(6)}\n` +
                  `   Current: $${pos.currentPrice.toFixed(6)}\n`;
      });
    }

    ctx.reply(message);

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "Portfolio command failed");
    ctx.reply(`❌ Portfolio fetch failed: ${error.message}`);
  }
});

bot.command("positions", async (ctx) => {
  try {
    const positions = await ManualPosition.find({ 
      telegramId: String(ctx.from.id), 
      status: 'open' 
    }).sort({ createdAt: -1 });

    if (positions.length === 0) {
      return ctx.reply("📭 No open positions found");
    }

    let message = `📋 Open Positions (${positions.length})\n\n`;

    for (const pos of positions) {
      const currentPrice = await getCurrentPrice(pos.mint);
      const pnl = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
      
      message += `🪙 ${pos.mint.slice(0, 8)}...\n` +
                `   Amount: ${pos.solAmount.toFixed(4)} SOL\n` +
                `   Entry: $${pos.entryPrice.toFixed(6)}\n` +
                `   Current: $${currentPrice.toFixed(6)}\n` +
                `   P&L: ${pnl.toFixed(2)}%\n`;

      if (pos.stopLoss) message += `   🛑 SL: ${pos.stopLoss}%\n`;
      if (pos.takeProfit) message += `   🎯 TP: ${pos.takeProfit}%\n`;
      if (pos.trailingStop) message += `   📉 Trail: ${pos.trailingStop}%\n`;
      
      message += `   ID: ${pos._id}\n\n`;
    }

    ctx.reply(message);

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "Positions command failed");
    ctx.reply(`❌ Positions fetch failed: ${error.message}`);
  }
});

bot.command("history", async (ctx) => {
  try {
    const parts = ctx.message.text.split(" ").filter(Boolean);
    const limit = parts[1] ? parseInt(parts[1]) : 5;

    const trades = await getTradeHistory(String(ctx.from.id), limit);

    if (trades.length === 0) {
      return ctx.reply("📝 No trade history found");
    }

    let message = `📝 Recent Trades (Last ${trades.length})\n\n`;

    trades.forEach((trade, index) => {
      const date = new Date(trade.createdAt).toLocaleDateString();
      const typeEmoji = trade.type.includes('buy') ? '🟢' : '🔴';
      const action = trade.type.includes('buy') ? 'BUY' : 'SELL';
      
      message += `${index + 1}. ${typeEmoji} ${action} - ${date}\n` +
                `   Token: ${trade.mint.slice(0, 8)}...\n` +
                `   Amount: ${trade.solAmount.toFixed(4)} SOL\n` +
                `   Price: $${trade.price.toFixed(6)}\n`;
      
      if (trade.sellPercentage) {
        message += `   Sold: ${trade.sellPercentage}%\n`;
      }
      
      message += `   TX: ${trade.txid.slice(0, 12)}...\n\n`;
    });

    ctx.reply(message);

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "History command failed");
    ctx.reply(`❌ History fetch failed: ${error.message}`);
  }
});

bot.command("balance", async (ctx) => {
  try {
    const parts = ctx.message.text.split(" ").filter(Boolean);
    const mint = parts[1]; // Optional specific token

    const user = await User.findOne({ telegramId: String(ctx.from.id) });
    if (!user) {
      return ctx.reply("❌ User not registered. Use /register first");
    }

    // Get SOL balance
    const solBalance = await connection.getBalance(new PublicKey(user.wallet));
    const solFormatted = solBalance / LAMPORTS_PER_SOL;

    let message = `💰 Balance Summary\n\n` +
                 `👛 Wallet: ${user.wallet.slice(0, 8)}...\n` +
                 `💎 SOL: ${solFormatted.toFixed(4)} SOL\n`;

    // If specific token requested
    if (mint) {
      try {
        const tokenBalance = await getTokenBalanceForMint(String(ctx.from.id), mint);
        const currentPrice = await getCurrentPrice(mint);
        const valueInSol = tokenBalance * currentPrice;
        
        message += `\n🪙 Token: ${mint.slice(0, 8)}...\n` +
                  `   Balance: ${tokenBalance.toFixed(4)}\n` +
                  `   Current Price: $${currentPrice.toFixed(6)}\n` +
                  `   Value: ${valueInSol.toFixed(4)} SOL`;
      } catch (error) {
        message += `\n❌ Could not fetch balance for ${mint.slice(0, 8)}...`;
      }
    }

    ctx.reply(message);

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "Balance command failed");
    ctx.reply(`❌ Balance check failed: ${error.message}`);
  }
});

bot.command("set_sl", async (ctx) => {
  try {
    const parts = ctx.message.text.split(" ").filter(Boolean);
    if (parts.length < 3) {
      return ctx.reply("Usage: /set_sl <position_id> <stop_loss_percent>");
    }

    const positionId = parts[1];
    const stopLoss = parseFloat(parts[2]);

    const position = await ManualPosition.findById(positionId);
    if (!position || position.telegramId !== String(ctx.from.id)) {
      return ctx.reply("❌ Position not found or access denied");
    }

    position.stopLoss = stopLoss;
    await position.save();

    // Restart monitoring with new parameters
    await ensureManualPositionMonitor(String(ctx.from.id), positionId, {
      stopLoss,
      takeProfit: position.takeProfit,
      trailingStop: position.trailingStop,
      autoManage: true
    });

    ctx.reply(`✅ Stop loss set to ${stopLoss}% for position`);

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "Set SL command failed");
    ctx.reply(`❌ Failed to set stop loss: ${error.message}`);
  }
});

bot.command("set_tp", async (ctx) => {
  try {
    const parts = ctx.message.text.split(" ").filter(Boolean);
    if (parts.length < 3) {
      return ctx.reply("Usage: /set_tp <position_id> <take_profit_percent>");
    }

    const positionId = parts[1];
    const takeProfit = parseFloat(parts[2]);

    const position = await ManualPosition.findById(positionId);
    if (!position || position.telegramId !== String(ctx.from.id)) {
      return ctx.reply("❌ Position not found or access denied");
    }

    position.takeProfit = takeProfit;
    await position.save();

    // Restart monitoring with new parameters
    await ensureManualPositionMonitor(String(ctx.from.id), positionId, {
      stopLoss: position.stopLoss,
      takeProfit,
      trailingStop: position.trailingStop,
      autoManage: true
    });

    ctx.reply(`✅ Take profit set to ${takeProfit}% for position`);

  } catch (error) {
    LOG.error({ error, user: ctx.from.id }, "Set TP command failed");
    ctx.reply(`❌ Failed to set take profit: ${error.message}`);
  }
});

// ========= NEW: Database Models (add to your models) =========
/*
// models/TradeHistory.js
import mongoose from 'mongoose';

const tradeHistorySchema = new mongoose.Schema({
  telegramId: { type: String, required: true, index: true },
  wallet: { type: String, required: true },
  mint: { type: String, required: true },
  type: { type: String, required: true }, // manual_buy, manual_sell_all, manual_sell_partial, auto_buy, etc.
  solAmount: { type: Number, required: true },
  price: { type: Number, required: true },
  txid: { type: String, required: true },
  sellPercentage: { type: Number }, // for partial sells
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('TradeHistory', tradeHistorySchema);

// models/ManualPosition.js
import mongoose from 'mongoose';

const manualPositionSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, index: true },
  wallet: { type: String, required: true },
  mint: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  solAmount: { type: Number, required: true },
  tokenAmount: { type: Number, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  stopLoss: { type: Number },
  takeProfit: { type: Number },
  trailingStop: { type: Number },
  trailingPeak: { type: Number }, // highest price reached for trailing stop
  exitPrice: { type: Number },
  exitDate: { type: Date }
}, { timestamps: true });

export default mongoose.model('ManualPosition', manualPositionSchema);
*/

// ========= Utility Functions =========
async function calculateTokenAmount(mint, solAmount) {
  const price = await getCurrentPrice(mint);
  return solAmount / price;
}

// ... (keep all the existing utility functions from previous code)

// ========= Start bot =========
bot.launch().then(() => {
  LOG.info("Bot launched with MANUAL trading capabilities");
  LOG.info("New commands available: /buy, /sell, /portfolio, /positions, /history, /balance, /set_sl, /set_tp");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// ========= Exports for testing =========
export default { 
  bot, 
  ensureMonitor, 
  monitored,
  executeManualBuy,
  executeManualSell,
  getPortfolioSummary,
  getTradeHistory
};