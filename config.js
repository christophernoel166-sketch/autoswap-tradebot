// config.js
import dotenv from "dotenv";
dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name, def = null) {
  const value = process.env[name];
  return value !== undefined && value !== "" ? value : def;
}

// 🔑 ADD THIS
const SERVICE_ROLE = optionalEnv("SERVICE_ROLE", "api");

export const config = {
  env: optionalEnv("NODE_ENV", "development"),

  serviceRole: SERVICE_ROLE,

  server: {
    port: Number(optionalEnv("PORT", 4000)),
  },

  mongo: {
    uri: requireEnv("MONGO_URI"),
    dbName: optionalEnv("DB_NAME", "solana_tradebot"),
  },

  telegram: {
    token: optionalEnv("TELEGRAM_BOT_TOKEN", null),
  },

  // ✅ THIS IS THE FIX
  telegramBotEnabled:
    SERVICE_ROLE === "telegram-bot" &&
    Boolean(optionalEnv("TELEGRAM_BOT_TOKEN")),

  solana: {
    rpcUrl: optionalEnv(
      "RPC_URL",
      "https://api.mainnet-beta.solana.com"
    ),
    slippageBps: Number(optionalEnv("SLIPPAGE_BPS", 100)),
    feeWallet: optionalEnv("FEE_WALLET", null),
  },

  trading: {
    pollIntervalMs: Number(optionalEnv("POLL_INTERVAL_MS", 15_000)),
  },

  admins: optionalEnv("BOT_ADMINS", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

console.log("✅ Configuration loaded", {
  env: config.env,
  role: config.serviceRole,
  port: config.server.port,
  mongo: "connected via URI",
  telegramBotEnabled: config.telegramBotEnabled,
  solanaRpc: config.solana.rpcUrl,
});
