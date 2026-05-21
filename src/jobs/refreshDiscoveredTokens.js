import DiscoveredToken from "../api/models/DiscoveredToken.js";
import { fetchTokenMarketData } from "../scanner/fetchTokenMarketData.js";

const REFRESH_INTERVAL_MS = 60 * 1000; // every 60 seconds
const BATCH_SIZE = 10;

let refreshRunning = false;

async function refreshDiscoveredTokensOnce() {
  if (refreshRunning) return;

  refreshRunning = true;

  try {
    const tokens = await DiscoveredToken.find({
      mintAddress: { $exists: true, $ne: null },
    })
      .sort({ updatedAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    for (const token of tokens) {
      try {
        const market = await fetchTokenMarketData(token.mintAddress);

        await DiscoveredToken.findOneAndUpdate(
          { mintAddress: token.mintAddress },
          {
            pairAddress: market.token?.pairAddress || token.pairAddress,
            dexId: market.token?.dexId || token.dexId,
            pairCreatedAt: market.rawPair?.pairCreatedAt || token.pairCreatedAt,
            name: market.token?.name || token.name,
            symbol: market.token?.symbol || token.symbol,
            ageMinutes: market.metrics?.ageMinutes ?? token.ageMinutes,
            liquidityUsd: market.metrics?.liquidityUsd ?? token.liquidityUsd,
            marketCapUsd: market.metrics?.marketCapUsd ?? token.marketCapUsd,
            volume5mUsd: market.metrics?.volume5mUsd ?? token.volume5mUsd,
            buys5m: market.metrics?.buys5m ?? token.buys5m,
            sells5m: market.metrics?.sells5m ?? token.sells5m,
            boosted: market.metrics?.boosted ?? token.boosted,
            lastSeenAt: new Date(),
          },
          { new: true }
        );
      } catch (err) {
        // Keep this small to avoid Railway log flooding
        console.warn(
          "Discovered token refresh skipped:",
          token.symbol || token.mintAddress,
          err?.response?.status || err?.message || String(err)
        );
      }
    }
  } catch (err) {
    console.warn(
      "refreshDiscoveredTokensOnce failed:",
      err?.message || String(err)
    );
  } finally {
    refreshRunning = false;
  }
}

export function startDiscoveredTokenRefresher() {
  console.log("🔄 Discovered token refresher started");

  refreshDiscoveredTokensOnce();

  setInterval(() => {
    refreshDiscoveredTokensOnce();
  }, REFRESH_INTERVAL_MS);
}