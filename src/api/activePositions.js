import express from "express";
import { redis } from "../utils/redis.js";
import { walletSnapshotKey } from "../redis/positionKeys.js";
import User from "../../models/User.js";

const router = express.Router();

/**
 * ===================================================
 * 📊 ACTIVE POSITIONS (SNAPSHOT-BASED)
 * GET /api/active-positions/:walletAddress
 * ===================================================
 */
router.get("/:walletAddress", async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress || "").trim();

if (!walletAddress) {
      return res.status(400).json({ error: "wallet_required" });
    }

const user = await User.findOne({
  walletAddress,
});

if (!user) {
  return res.json({
    positions: [],
    phantomHoldings: [],
  });
}

const tradingWalletPublicKey =
  user.tradingWalletPublicKey;

console.log(
  "🧪 ACTIVE POSITIONS WALLET",
  {
    walletAddress,
    tradingWalletPublicKey,
  }
);

    

  const activeMints = await redis.smembers(
  `wallet:active:${walletAddress}`
);

console.log(
  "🧪 ACTIVE MINTS",
  activeMints
);

const positions = [];

for (const mint of activeMints) {
  const posKey =
    `position:${walletAddress}:${mint}`;

  const pos =
    await redis.hgetall(posKey);

console.log(
  "🧪 POSITION RETURNED",
  {
    mint,
    currentPrice: pos.currentPrice,
    entryPrice: pos.entryPrice,
    tokenAmount: pos.tokenAmount,
  }
);

console.log(
  "🧪 POSITION HASH",
  {
    mint,
    posKey,
    fields: Object.keys(pos),
    status: pos.status,
  }
);

  if (
    !pos ||
    Object.keys(pos).length === 0
  ) {
    continue;
  }

  positions.push({
    walletAddress,
    mint,

    sourceChannel:
      pos.sourceChannel || null,

    solAmount: Number(
      pos.solAmount || 0
    ),

    tokenAmount: Number(
      pos.tokenAmount || 0
    ),

    entryPrice: Number(
      pos.entryPrice || 0
    ),

    currentPrice: Number(
      pos.currentPrice || 0
    ),

    changePercent: Number(
      pos.changePercent || 0
    ),

    pnlSol: Number(
      pos.pnlSol || 0
    ),

    buyTxid:
      pos.buyTxid || null,

    tpStage: Number(
      pos.tpStage || 0
    ),

    highestPrice: Number(
      pos.highestPrice || 0
    ),

    openedAt: Number(
      pos.openedAt || 0
    ),

    status:
      pos.status || "open",
  });
}

console.log(
  "🧪 DASHBOARD POSITIONS",
  positions.map(p => ({
    mint: p.mint,
    status: p.status,
    tokenAmount: p.tokenAmount
  }))
);

return res.json({
  positions,
  phantomHoldings: []
});



  } catch (err) {
    console.error("active-positions error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;