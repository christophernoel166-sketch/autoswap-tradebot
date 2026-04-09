// src/scanner/fetchTokenHolderData.js

import { Connection, PublicKey } from "@solana/web3.js";

const KNOWN_BURN_WALLETS = new Set([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
]);

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAddress(value) {
  return typeof value === "string" ? value.trim() : "";
}

function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((safeNumber(value, 0) + Number.EPSILON) * factor) / factor;
}

async function getParsedAccountOwner(connection, tokenAccountAddress) {
  try {
    const info = await connection.getParsedAccountInfo(
      new PublicKey(tokenAccountAddress),
      "confirmed"
    );

    const parsed = info?.value?.data?.parsed?.info || null;
    const owner = normalizeAddress(parsed?.owner || tokenAccountAddress);

    return { owner, parsed };
  } catch {
    return {
      owner: normalizeAddress(tokenAccountAddress),
      parsed: null,
    };
  }
}

export async function fetchTokenHolderData(tokenMint) {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;

  if (!rpcUrl) throw new Error("ALCHEMY_RPC_URL not set");

  const connection = new Connection(rpcUrl, "confirmed");
  const mintPubkey = new PublicKey(tokenMint);

  const supplyInfo = await connection.getTokenSupply(mintPubkey);
  const totalSupply = safeNumber(supplyInfo?.value?.uiAmount, 0);

  const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
  const accounts = largestAccounts?.value || [];

  const topAccounts = accounts.slice(0, 15);

  const resolved = [];

  for (const acc of topAccounts) {
    const tokenAccountAddress = acc.address.toBase58();
    const amount = safeNumber(acc.uiAmount, 0);

    if (amount <= 0) continue;

    const { owner } = await getParsedAccountOwner(
      connection,
      tokenAccountAddress
    );

    const percent = (amount / totalSupply) * 100;

    resolved.push({
      address: tokenAccountAddress,
      owner,
      amount: round(amount),
      percent: round(percent),
    });

    await new Promise((r) => setTimeout(r, 80));
  }

  // 🔥 GROUP BY OWNER
  const grouped = new Map();

  for (const item of resolved) {
    const owner = normalizeAddress(item.owner);

    if (!owner) continue;

    // only exclude obvious burn wallets
    if (KNOWN_BURN_WALLETS.has(owner)) continue;

    const current = grouped.get(owner) || 0;
    grouped.set(owner, current + item.amount);
  }

  const holders = Array.from(grouped.entries())
    .map(([owner, amount]) => ({
      address: owner,
      owner,
      amount: round(amount),
      percent: round((amount / totalSupply) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);

  const largestHolderPercent = holders[0]?.percent || 0;

  const top10HoldingPercent = holders
    .slice(0, 10)
    .reduce((sum, h) => sum + safeNumber(h.percent), 0);

  return {
    holderCount: holders.length,
    largestHolderPercent: round(largestHolderPercent),
    top10HoldingPercent: round(top10HoldingPercent),
    topHolders: holders.slice(0, 10),
    excludedAccounts: [], // optional
  };
}