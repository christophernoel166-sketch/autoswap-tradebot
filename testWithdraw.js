import "dotenv/config";

import { Connection, Keypair } from "@solana/web3.js";

import bs58 from "bs58";

import { withdrawSplToken } from "./services/withdrawSplToken.js";

// ==========================================
// RPC Connection
// ==========================================
const connection = new Connection(
  process.env.RPC_URL,
  "confirmed"
);

// ==========================================
// Load Wallet
// ==========================================
const payer = Keypair.fromSecretKey(
  bs58.decode(process.env.PRIVATE_KEY)
);

// ==========================================
// TEST CONFIG
// ==========================================


const TEST_TOKEN_MINT =
  "5s7tf6ih2CEZf7ZPNkJAtcknAq9DL5GsWHMMT3Jdpump";

const DESTINATION_WALLET =
  "DyD8hwaXNQbQt3Qxr2aZ9pRwjoifKxNmvgQrHgdpS61K";

// Raw amount
// Example:
// 1 token with 6 decimals = 1000000
const AMOUNT = 1000000;

// ==========================================
// RUN TEST
// ==========================================
async function runTest() {
  console.log(
    "🚀 Starting SPL withdrawal test..."
  );

  const result =
    await withdrawSplToken({
      connection,
      payer,
      mintAddress:
        TEST_TOKEN_MINT,
      destinationWallet:
        DESTINATION_WALLET,
      amount: AMOUNT,
    });

  console.log(
    "✅ Result:",
    result
  );
}

runTest().catch(console.error);