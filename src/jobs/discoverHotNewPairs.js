import axios from "axios";
import DiscoveredToken from "../api/models/DiscoveredToken.js";

const HOT_PAIR_DISCOVERY_INTERVAL_MS = 60 * 1000;

let discoveryRunning = false;

async function discoverHotNewPairsOnce() {
  if (discoveryRunning) return;

  discoveryRunning = true;

  try {
    const response = await axios.get(
      "https://api.dexscreener.com/latest/dex/search?q=solana",
      {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "AutoswapsBot/1.0",
        },
      }
    );

    const pairs = Array.isArray(response.data?.pairs)
      ? response.data.pairs
      : [];

    const now = Date.now();

    const hotPairs = pairs
      .filter((pair) => pair?.chainId === "solana")
      .map((pair) => {
        const mintAddress = pair?.baseToken?.address;
        const pairCreatedAt = pair?.pairCreatedAt || null;

        const ageMinutes = pairCreatedAt
          ? Math.floor((now - Number(pairCreatedAt)) / 60000)
          : null;

        const buys5m = Number(pair?.txns?.m5?.buys || 0);
        const sells5m = Number(pair?.txns?.m5?.sells || 0);
        const txns5m = buys5m + sells5m;

        return {
          chainId: pair.chainId,
          mintAddress,
          pairAddress: pair.pairAddress || null,
          dexId: pair.dexId || null,
          pairCreatedAt,
          name: pair?.baseToken?.name || "Hot New Pair",
          symbol: pair?.baseToken?.symbol || "UNKNOWN",
          icon: pair?.info?.imageUrl || null,
          url: pair?.url || null,
          links: pair?.info?.websites || [],
          ageMinutes,
          liquidityUsd: Number(pair?.liquidity?.usd || 0),
          marketCapUsd: Number(pair?.marketCap || pair?.fdv || 0),
          volume5mUsd: Number(pair?.volume?.m5 || 0),
          buys5m,
          sells5m,
          boosted: Boolean(pair?.boosts?.active),
          txns5m,
        };
      })
      .filter((t) => t.mintAddress)
      .filter((t) => t.ageMinutes != null)
      .filter((t) => t.ageMinutes >= 1 && t.ageMinutes <= 24 * 60)
      .filter((t) => Number(t.liquidityUsd || 0) >= 10000)
      .filter((t) => Number(t.volume5mUsd || 0) >= 1000)
      .filter((t) => Number(t.txns5m || 0) >= 50)
      .slice(0, 50);

    await Promise.all(
      hotPairs.map((token) =>
        DiscoveredToken.findOneAndUpdate(
          { mintAddress: token.mintAddress },
          {
            $set: {
              chainId: token.chainId,
              pairAddress: token.pairAddress,
              dexId: token.dexId,
              pairCreatedAt: token.pairCreatedAt,
              name: token.name,
              symbol: token.symbol,
              icon: token.icon,
              url: token.url,
              links: token.links,
              ageMinutes: token.ageMinutes,
              liquidityUsd: token.liquidityUsd,
              marketCapUsd: token.marketCapUsd,
              volume5mUsd: token.volume5mUsd,
              buys5m: token.buys5m,
              sells5m: token.sells5m,
              boosted: token.boosted,
              lastSeenAt: new Date(),
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        )
      )
    );

    if (hotPairs.length > 0) {
      console.log(`🔥 Hot new pairs discovered: ${hotPairs.length}`);
    }
  } catch (err) {
    console.warn(
      "discoverHotNewPairsOnce failed:",
      err?.response?.status || err?.message || String(err)
    );
  } finally {
    discoveryRunning = false;
  }
}

export function startHotNewPairsDiscovery() {
  console.log("🔥 Hot new pairs discovery started");

  discoverHotNewPairsOnce();

  setInterval(() => {
    discoverHotNewPairsOnce();
  }, HOT_PAIR_DISCOVERY_INTERVAL_MS);
}