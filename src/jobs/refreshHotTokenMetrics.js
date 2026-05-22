import DiscoveredToken from "../api/models/DiscoveredToken.js";
import { fetchTokenMarketData } from "../scanner/fetchTokenMarketData.js";

const HOT_REFRESH_INTERVAL_MS = 10 * 1000; // every 10 seconds
const HOT_BATCH_SIZE = 30;

let hotRefreshRunning = false;

async function refreshHotTokenMetricsOnce() {
  if (hotRefreshRunning) return;

  hotRefreshRunning = true;

  try {
    const tokens = await DiscoveredToken.find({
      liquidityUsd: { $gte: 10000 },
      volume5mUsd: { $gte: 1000 },
      buys5m: { $gte: 50 },
      sells5m: { $gte: 50 },
    })
      .sort({ volume5mUsd: -1, lastSeenAt: -1 })
      .limit(HOT_BATCH_SIZE)
      .lean();

    for (const token of tokens) {
      try {
        const market = await fetchTokenMarketData(token.mintAddress);

        await DiscoveredToken.findOneAndUpdate(
          { mintAddress: token.mintAddress },
          {
            marketCapUsd: market.metrics?.marketCapUsd ?? token.marketCapUsd,
            volume5mUsd: market.metrics?.volume5mUsd ?? token.volume5mUsd,
            buys5m: market.metrics?.buys5m ?? token.buys5m,
            sells5m: market.metrics?.sells5m ?? token.sells5m,
            liquidityUsd: market.metrics?.liquidityUsd ?? token.liquidityUsd,
            ageMinutes: market.metrics?.ageMinutes ?? token.ageMinutes,
            pairCreatedAt: market.rawPair?.pairCreatedAt || token.pairCreatedAt,
            lastSeenAt: new Date(),
          },
          { new: true }
        );
      } catch (err) {
        console.warn(
          "Hot token metrics refresh skipped:",
          token.symbol || token.mintAddress,
          err?.response?.status || err?.message || String(err)
        );
      }
    }
  } catch (err) {
    console.warn("refreshHotTokenMetricsOnce failed:", err?.message || String(err));
  } finally {
    hotRefreshRunning = false;
  }
}

export function startHotTokenMetricsRefresher() {
  console.log("🔥 Hot token metrics refresher started");

  refreshHotTokenMetricsOnce();

  setInterval(() => {
    refreshHotTokenMetricsOnce();
  }, HOT_REFRESH_INTERVAL_MS);
}