// src/scanner/fetchTokenMarketData.js

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function fetchTokenMarketData(tokenMint) {
  if (!tokenMint || typeof tokenMint !== "string") {
    throw new Error("tokenMint is required");
  }

  const mint = tokenMint.trim();

  // DexScreener token pairs endpoint
  const url = `https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(mint)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`DexScreener request failed with status ${res.status}`);
  }

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No market pairs found for this token");
  }

  // Pick the best pair by highest liquidity
  const bestPair = [...data].sort((a, b) => {
    const aLiquidity = safeNumber(a?.liquidity?.usd, 0);
    const bLiquidity = safeNumber(b?.liquidity?.usd, 0);
    return bLiquidity - aLiquidity;
  })[0];

  if (!bestPair) {
    throw new Error("No usable pair found for this token");
  }

  const pairCreatedAt = safeNumber(bestPair?.pairCreatedAt, 0);
  const ageMinutes = pairCreatedAt
    ? Math.max(0, Math.floor((Date.now() - pairCreatedAt) / 1000 / 60))
    : 0;

  return {
    token: {
      mintAddress: mint,
      symbol: safeString(bestPair?.baseToken?.symbol, "UNKNOWN"),
      name: safeString(bestPair?.baseToken?.name, "Unknown Token"),
      pairAddress: safeString(bestPair?.pairAddress, ""),
      dexId: safeString(bestPair?.dexId, ""),
      chainId: safeString(bestPair?.chainId, "solana"),
      boosted: safeNumber(bestPair?.boosts?.active, 0) > 0,
    },

    metrics: {
      ageMinutes,
      liquidityUsd: safeNumber(bestPair?.liquidity?.usd, 0),
      marketCapUsd: safeNumber(bestPair?.marketCap, 0),
      volume5mUsd: safeNumber(bestPair?.volume?.m5, 0),
      buys5m: safeNumber(bestPair?.txns?.m5?.buys, 0),
      sells5m: safeNumber(bestPair?.txns?.m5?.sells, 0),
      boosted: safeNumber(bestPair?.boosts?.active, 0) > 0,
    },

    rawPair: bestPair,
  };
}