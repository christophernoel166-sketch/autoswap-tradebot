// config.js
import dotenv from "dotenv";

dotenv.config();

/**
 * Helper: require env variable
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Helper: optional env with default
 */
function optionalEnv(name, def = null) {
  return process.env[name] ?? def;
}

/**
 * Validate Solana RPC URL
 */
function validateRpcUrl(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      `❌ RPC_URL must start with http:// or https:// (got: ${url})`
    );
  }
  return url;
}

export const config = {
  // ===================================================
  // ENV
  // ===================================================
  env: optionalEnv("NODE_ENV", "development"),

  // ===================================================
  // TELEGRAM
  // ===================================================
  telegram: {
    token: requireEnv("TELEGRAM_BOT_TOKEN"),
  },

  // ===================================================
  // DATABASE
  // ===================================================
  mongo: {
    uri: requireEnv("MONGO_URI"),
    dbName: optionalEnv("DB_NAME", "solana_tradebot"),
  },

  // ===================================================
  // SOLANA
  // ===================================================
  solana: {
    rpcUrl: validateRpcUrl(
      optionalEnv("RPC_URL", "https://api.mainnet-beta.solana.com")
    ),
    slippageBps: Number(optionalEnv("SLIPPAGE_BPS", 100)),
    feeWallet: optionalEnv("FEE_WALLET", null),
  },

  // ===================================================
  // TRADING ENGINE
  // ===================================================
  polling: {
    intervalMs: Number(optionalEnv("POLL_INTERVAL_MS", 15_000)),
  },

  // ===================================================
  // ADMINS
  // ===================================================
  admins: optionalEnv("BOT_ADMINS", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

console.log("✅ Config loaded:", {
  env: config.env,
  mongo: "OK",
  telegram: "OK",
  solanaRpc: config.solana.rpcUrl,
});
