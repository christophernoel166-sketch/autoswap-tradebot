import axios from "axios";
import DiscoveredToken from "../api/models/DiscoveredToken.js";
import { fetchTokenMarketData } from "../scanner/fetchTokenMarketData.js";

const DISCOVERY_INTERVAL_MS = 2 * 60 * 1000;
const BATCH_SIZE = 40;
const BATCH_DELAY_MS = 15 * 1000;

let discoveryRunning = false;
let cursor = 0;
let candidateQueue = [];

const discoveryUrls = [
  "https://api.dexscreener.com/token-profiles/latest/v1",
  "https://api.dexscreener.com/token-boosts/latest/v1",
  "https://api.dexscreener.com/token-boosts/top/v1",
  "https://api.dexscreener.com/community-takeovers/latest/v1",
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQualifiedToken(token) {
  const age = Number(token.ageMinutes || 0);
  const liquidity = Number(token.liquidityUsd || 0);
  const volume5m = Number(token.volume5mUsd || 0);
  const buys = Number(token.buys5m || 0);
  const sells = Number(token.sells5m || 0);
  const txns = buys + sells;

  return (
    age >= 1 &&
    age <= 24 * 60 &&
    liquidity >= 10000 &&
    volume5m >= 1000 &&
    txns >= 70
  );
}

async function fetchCandidateTokens() {
  const responses = await Promise.allSettled(
    discoveryUrls.map((url) =>
      axios.get(url, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "AutoswapsBot/1.0",
        },
      })
    )
  );

  const rawItems = responses.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    return Array.isArray(result.value?.data) ? result.value.data : [];
  });

  const solanaItems = rawItems.filter((item) => item?.chainId === "solana");

  const seen = new Set();

  return solanaItems
    .map((item) => ({
      chainId: item.chainId,
      mintAddress: item.tokenAddress,
      fallbackName: item.description || "New Solana Token",
      fallbackSymbol: item.symbol || "UNKNOWN",
      url: item.url || null,
      icon: item.icon || null,
      links: item.links || [],
    }))
    .filter((item) => item.mintAddress)
    .filter((item) => {
      if (seen.has(item.mintAddress)) return false;
      seen.add(item.mintAddress);
      return true;
    });
}

async function processCandidateBatch(batch) {
  for (const item of batch) {
    try {
      const market = await fetchTokenMarketData(item.mintAddress);

      const token = {
        chainId: item.chainId,
        mintAddress: item.mintAddress,
        pairAddress: market.token?.pairAddress || null,
        dexId: market.token?.dexId || null,
        pairCreatedAt: market.rawPair?.pairCreatedAt || null,
        name: market.token?.name || item.fallbackName,
        symbol: market.token?.symbol || item.fallbackSymbol,
        icon: item.icon,
        url: item.url,
        links: item.links,
        ageMinutes: market.metrics?.ageMinutes ?? null,
        liquidityUsd: market.metrics?.liquidityUsd ?? null,
        marketCapUsd: market.metrics?.marketCapUsd ?? null,
        volume5mUsd: market.metrics?.volume5mUsd ?? null,
        buys5m: market.metrics?.buys5m ?? null,
        sells5m: market.metrics?.sells5m ?? null,
        boosted: market.metrics?.boosted || false,
        lastSeenAt: new Date(),
      };

      if (!isQualifiedToken(token)) continue;

      await DiscoveredToken.findOneAndUpdate(
        { mintAddress: token.mintAddress },
        {
          $set: token,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    } catch (err) {
      console.warn(
        "Batched discovery skipped:",
        item.fallbackSymbol || item.mintAddress,
        err?.response?.status || err?.message || String(err)
      );
    }

    await wait(500);
  }
}

async function runBatchedDiscoveryOnce() {
  if (discoveryRunning) return;

  discoveryRunning = true;

  try {
    if (!candidateQueue.length || cursor >= candidateQueue.length) {
      candidateQueue = await fetchCandidateTokens();
      cursor = 0;

      console.log(
        `🧭 Batched discovery loaded candidates: ${candidateQueue.length}`
      );
    }

    const batch = candidateQueue.slice(cursor, cursor + BATCH_SIZE);
    cursor += BATCH_SIZE;

    if (!batch.length) return;

    console.log(
      `🧭 Processing discovery batch: ${batch.length}, cursor: ${cursor}/${candidateQueue.length}`
    );

    await processCandidateBatch(batch);
  } catch (err) {
    console.warn(
      "runBatchedDiscoveryOnce failed:",
      err?.response?.status || err?.message || String(err)
    );
  } finally {
    discoveryRunning = false;
  }
}

export function startBatchedDexscreenerDiscovery() {
  console.log("🧭 Batched Dexscreener discovery started");

  runBatchedDiscoveryOnce();

  setInterval(() => {
    runBatchedDiscoveryOnce();
  }, BATCH_DELAY_MS);

  setInterval(async () => {
    if (!discoveryRunning) {
      candidateQueue = [];
      cursor = 0;
    }
  }, DISCOVERY_INTERVAL_MS);
}