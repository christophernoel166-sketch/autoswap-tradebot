// config.js
import dotenv from "dotenv";

dotenv.config();

/**
 * ===================================================
 * Helpers
 * ===================================================
 */

/**
 * Require an environment variable (fail fast)
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Optional env with default
 */
function optionalEnv(name, def = null) {
  const value = process.env[name];
  return value !== undefined && value !== "" ? value : def;
}

/**
 * Validate Solana RPC URL
 */
function validateRpcUrl(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      `❌ Invalid RPC_URL: must start with http:// or https:// (got "${url}")`
    );
  }
  return url;
}

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
  // SERVER / API
  // -----------------------------------------------
  server: {
    port: Number(optionalEnv("PORT", 4000)),
  },

  // -----------------------------------------------
  // DATABASE
  // -----------------------------------------------
  mongo: {
    uri: requireEnv("MONGO_URI"),
    dbName: optionalEnv("DB_NAME", "solana_tradebot"),
  },

  // -----------------------------------------------
  // TELEGRAM BOT
  // (Only required if bot is enabled)
  // -----------------------------------------------
  telegram: {
    token: optionalEnv("TELEGRAM_BOT_TOKEN", null),
  },

  // -----------------------------------------------
  // SOLANA
  // -----------------------------------------------
  solana: {
    rpcUrl: validateRpcUrl(
      optionalEnv("RPC_URL", "https://api.mainnet-beta.solana.com")
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
  port: config.server.port,
  mongo: "connected via URI",
  telegramBotEnabled: Boolean(config.telegram.token),
  solanaRpc: config.solana.rpcUrl,
});
