import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;

// =============== Schema Definition ===============
const settingsSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  stopLoss: { type: String, default: "" },
  trailingStop: { type: String, default: "" },
  distanceStopLoss: { type: String, default: "" },
  tp1: { type: String, default: "" },
  tp2: { type: String, default: "" },
  tp3: { type: String, default: "" },
  tradeAmount: { type: String, default: "" },
}, { timestamps: true });

// Maintain global _id → walletAddress mapping for deletions
settingsSchema.post("init", function (doc) {
  if (!global.walletIdMap) global.walletIdMap = new Map();
  global.walletIdMap.set(doc._id.toString(), doc.walletAddress);
});
settingsSchema.post("save", function (doc) {
  if (!global.walletIdMap) global.walletIdMap = new Map();
  global.walletIdMap.set(doc._id.toString(), doc.walletAddress);
});
settingsSchema.post("remove", function (doc) {
  if (global.walletIdMap) global.walletIdMap.delete(doc._id.toString());
});

const TradeSetting = mongoose.model("TradeSetting", settingsSchema);

// =============== Core Logic ===============
const activeMonitors = new Map();
let changeStream = null;
let lastResumeToken = null;

/**
 * 🚀 Start monitoring wallet (stub for trading logic)
 */
function startMonitorForWallet(wallet, settings) {
  console.log(`\n🚀 AutoSwap Active for Wallet: ${wallet}`);
  console.log(`💰 Trade Amount: ${settings.tradeAmount || "N/A"} SOL`);
  console.log(`📊 Stop Loss: ${settings.stopLoss || "N/A"}%`);
  console.log(`📈 Trailing Stop: ${settings.trailingStop || "N/A"}%`);
  console.log(`📉 Distance Stop Loss: ${settings.distanceStopLoss || "N/A"}%`);
  console.log(`🎯 Take Profit 1: ${settings.tp1 || "N/A"}%`);
  console.log(`🎯 Take Profit 2: ${settings.tp2 || "N/A"}%`);
  console.log(`🎯 Take Profit 3: ${settings.tp3 || "N/A"}%`);
  console.log("─────────────────────────────");

  const intervalId = setInterval(() => {
    // Real trading logic would go here
  }, 10000);

  activeMonitors.set(wallet, intervalId);
}

/**
 * 🧹 Stop monitoring a wallet
 */
function stopMonitorForWallet(wallet) {
  const intervalId = activeMonitors.get(wallet);
  if (intervalId) {
    clearInterval(intervalId);
    activeMonitors.delete(wallet);
    console.log(`🛑 Stopped monitoring wallet: ${wallet}`);
  }
}

/**
 * 🔄 Load all wallets from DB and start monitoring
 */
async function initializeAutoSwap() {
  const wallets = await TradeSetting.find();
  console.log(`💼 Found ${wallets.length} wallet(s) in DB`);
  wallets.forEach(setting => startMonitorForWallet(setting.walletAddress, setting));

  console.log("👂 Starting change stream listener...");
  startChangeStream();
}

/**
 * 🧠 Watch MongoDB for real-time changes
 */
function startChangeStream() {
  try {
    const options = lastResumeToken ? { resumeAfter: lastResumeToken } : {};
    changeStream = TradeSetting.watch([], options);

    changeStream.on("change", async (change) => {
      const { operationType, fullDocument, documentKey, _id } = change;
      lastResumeToken = change._id; // Save for resume

      switch (operationType) {
        case "insert":
          console.log(`🆕 New wallet detected: ${fullDocument.walletAddress}`);
          startMonitorForWallet(fullDocument.walletAddress, fullDocument);
          break;

        case "update":
        case "replace":
          console.log(`♻️ Wallet updated: ${documentKey._id}`);
          const updated = await TradeSetting.findById(documentKey._id);
          if (updated) {
            stopMonitorForWallet(updated.walletAddress);
            startMonitorForWallet(updated.walletAddress, updated);
          }
          break;

        case "delete": {
          const deletedId = documentKey._id.toString();
          const walletAddress = global.walletIdMap?.get(deletedId);
          if (walletAddress) {
            stopMonitorForWallet(walletAddress);
            global.walletIdMap.delete(deletedId);
            console.log(`🗑️ Wallet deleted: ${walletAddress}`);
          } else {
            console.log(`⚠️ Wallet deleted (ID only): ${deletedId}`);
          }
          break;
        }

        default:
          console.log(`ℹ️ Unhandled operation: ${operationType}`);
          break;
      }
    });

    changeStream.on("error", (err) => {
      console.error("❌ Change stream error:", err.message);
      console.log("🔁 Attempting to restart change stream in 5s...");
      setTimeout(startChangeStream, 5000);
    });

    changeStream.on("end", () => {
      console.warn("⚠️ Change stream ended. Reconnecting...");
      setTimeout(startChangeStream, 5000);
    });

  } catch (err) {
    console.error("❌ Failed to start change stream:", err.message);
    console.log("🔁 Retrying in 10s...");
    setTimeout(startChangeStream, 10000);
  }
}

/**
 * 🔌 Connect with auto-reconnect and listeners
 */
async function connectWithRetry() {
  const connect = async () => {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ AutoSwap connected to MongoDB");
      await initializeAutoSwap();
    } catch (err) {
      console.error("❌ MongoDB connection error:", err.message);
      console.log("🔁 Retrying in 5s...");
      setTimeout(connect, 5000);
    }
  };

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected. Attempting reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("🔁 MongoDB reconnected. Resuming watchers...");
    startChangeStream();
  });

  connect();
}

// ✅ Start the AutoSwap system
connectWithRetry();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down AutoSwap...");
  if (changeStream) await changeStream.close().catch(() => {});
  for (const [wallet] of activeMonitors.entries()) stopMonitorForWallet(wallet);
  await mongoose.disconnect();
  process.exit(0);
});
