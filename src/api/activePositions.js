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
    let positions = [];
    try {
      const parsed = JSON.parse(raw);
      positions = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("active-positions snapshot parse error:", err);
      return res.json({ positions: [] });
    }

console.log(
  "🧪 SNAPSHOT POSITIONS",
  positions.map(p => ({
    mint: p.mint,
    tokenAmount: p.tokenAmount,
    status: p.status
  }))
);

    const normalized = positions.map((p) => ({
  walletAddress:
    p.walletAddress || walletAddress,
      mint: p.mint || null,
      sourceChannel: p.sourceChannel || null,

      solAmount: Number(p.solAmount || 0),
tokenAmount: Number(p.tokenAmount || 0),

entryPrice: Number(p.entryPrice || 0),
currentPrice: Number(p.currentPrice || 0),
changePercent: Number(p.changePercent || 0),
pnlSol: Number(p.pnlSol || 0),

      buyTxid: p.buyTxid || null,
      tpStage: Number(p.tpStage || 0),
      highestPrice: Number(p.highestPrice || 0),
      openedAt: Number(p.openedAt || 0),
    }));

   return res.json({
  positions: normalized,
  phantomHoldings: []
});
  } catch (err) {
    console.error("active-positions error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;