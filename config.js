// config.js
import dotenv from "dotenv";
dotenv.config();

/**
 * ===================================================
 * ENV HELPERS
 * ===================================================
 */
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

/**
 * ===================================================
 * SERVICE ROLE
 * ===================================================
 * api            → REST / WebSocket server
 * telegram-bot   → Telegram polling + trade engine
 */
const SERVICE_ROLE = String(optionalEnv("SERVICE_ROLE", "api")).trim();

/**
 * ===================================================
 * TELEGRAM ENABLE LOGIC (HARDENED + DEBUGGED)
 * ===================================================
 */
const TELEGRAM_TOKEN = optionalEnv("TELEGRAM_BOT_TOKEN", null);

const telegramBotEnabled = (() => {
  const role = SERVICE_ROLE;
  const hasToken = Boolean(TELEGRAM_TOKEN);

  const enabled =
    hasToken &&
    (
      role === "telegram-bot" ||
      role === "production" ||
      role === "api" ||       // 👈 allow bot even if role mis-set
      role === "worker" ||
      role === "bot"
    );

  console.log("🧪 TELEGRAM ENABLE CHECK", {
    role,
    hasToken,
    enabled,
  });

  return enabled;
})();

/**
 * ===================================================
 * CONFIG
 * ===================================================
 */
export const config = {
  // -----------------------------------------------
  // ENVIRONMENT
  // -----------------------------------------------
  env: optionalEnv("NODE_ENV", "development"),

  // -----------------------------------------------
  // SERVICE ROLE
  // -----------------------------------------------
  serviceRole: SERVICE_ROLE,

  // -----------------------------------------------
  // SERVER (Railway-safe)
  // -----------------------------------------------
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },

  // -----------------------------------------------
  // DATABASE
  // -----------------------------------------------
  mongo: {
    uri: requireEnv("MONGO_URI"),
    dbName: optionalEnv("DB_NAME", "solana_tradebot"),
  },

  // -----------------------------------------------
  // TELEGRAM
  // -----------------------------------------------
  telegram: {
    token: TELEGRAM_TOKEN,
  },

  // ✅ FINAL BOT ENABLE FLAG
  telegramBotEnabled,

  // -----------------------------------------------
  // SOLANA
  // -----------------------------------------------
  solana: {
    rpcUrl: optionalEnv(
      "RPC_URL",
      "https://api.mainnet-beta.solana.com"
    ),
    slippageBps: Number(optionalEnv("SLIPPAGE_BPS", 100)),
    feeWallet: optionalEnv("FEE_WALLET", null),
  },

  // -----------------------------------------------
  // TRADING ENGINE
  // -----------------------------------------------
  trading: {
    pollIntervalMs: Number(optionalEnv("POLL_INTERVAL_MS", 15_000)),
  },

  // -----------------------------------------------
  // ADMINS
  // -----------------------------------------------
  admins: optionalEnv("BOT_ADMINS", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

/**
 * ===================================================
 * SAFE STARTUP LOG (NO SECRETS)
 * ===================================================
 */
console.log("✅ Configuration loaded", {
  env: config.env,
  role: config.serviceRole,
  port: config.server.port,
  mongo: "connected via URI",
  telegramBotEnabled: config.telegramBotEnabled,
  solanaRpc: config.solana.rpcUrl,
});
