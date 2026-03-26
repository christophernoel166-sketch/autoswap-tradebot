// src/scanner/fetchTokenHolderData.js

import { Connection, PublicKey } from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function fetchTokenHolderData(tokenMint) {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;

  if (!rpcUrl) {
    throw new Error("ALCHEMY_RPC_URL not set");
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const mintPubkey = new PublicKey(tokenMint);

  // 1. Get largest token accounts
  const largestAccounts = await connection.getTokenLargestAccounts(
    mintPubkey
  );

  const accounts = largestAccounts.value;

  if (!accounts || accounts.length === 0) {
    throw new Error("No token accounts found");
  }

  // 2. Get total supply
  const supplyInfo = await connection.getTokenSupply(mintPubkey);
  const totalSupply = safeNumber(supplyInfo.value.uiAmount, 0);

  if (totalSupply <= 0) {
    throw new Error("Invalid token supply");
  }

  // 3. Calculate percentages
  const holders = accounts.map((acc) => {
    const amount = safeNumber(acc.uiAmount, 0);
    const percent = (amount / totalSupply) * 100;

    return {
      address: acc.address,
      amount,
      percent,
    };
  });

  // Sort descending
  holders.sort((a, b) => b.percent - a.percent);

  const holderCount = holders.length;
  const largestHolderPercent = holders[0]?.percent || 0;

  const top10HoldingPercent = holders
    .slice(0, 10)
    .reduce((sum, h) => sum + safeNumber(h.percent, 0), 0);

  return {
    holderCount,
    largestHolderPercent,
    top10HoldingPercent,
    topHolders: holders.slice(0, 10),
  };
}