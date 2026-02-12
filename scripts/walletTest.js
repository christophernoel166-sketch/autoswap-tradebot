import dotenv from "dotenv";
dotenv.config();

const {
  generateTradingWallet,
  restoreTradingWallet,
} = await import("../src/services/walletService.js");

// Generate wallet
const {
  publicKey,
  encryptedPrivateKey,
  iv,
} = generateTradingWallet();

console.log("Generated:", publicKey);

// Simulate user object
const fakeUser = {
  tradingWalletEncryptedPrivateKey: encryptedPrivateKey,
  tradingWalletIv: iv,
};

// Restore wallet
const restored = restoreTradingWallet(fakeUser);

console.log("Restored:", restored.publicKey.toBase58());
