import dotenv from "dotenv";
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",

  // Telegram
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,

  // MongoDB
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/solana-tradebot",

  // Solana / trading
  solana: {
    rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
    slippageBps: Number(process.env.SLIPPAGE_BPS || 100), // 1% default
    feeWallet: process.env.FEE_WALLET || null, // optional SOL fee receiver
  },

  // Polling interval for auto-trade updates
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 15000),

  // Admins (optional)
  admins: process.env.BOT_ADMINS ? process.env.BOT_ADMINS.split(",") : [],
};
