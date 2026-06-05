import DiscoveredToken from "../api/models/DiscoveredToken.js";
import { fetchTokenMarketData } from "../scanner/fetchTokenMarketData.js";

const REFRESH_INTERVAL_MS = 60 * 1000; // every 60 seconds
const BATCH_SIZE = 30;

let refreshRunning = false;

async function refreshDiscoveredTokensOnce() {
  if (refreshRunning) return;

  refreshRunning = true;

  try {
    const tokens = await DiscoveredToken.find({
      mintAddress: { $exists: true, $ne: null },
      $or: [
        { liquidityUsd: null },
        { marketCapUsd: null },
        { pairCreatedAt: null },
        {
          updatedAt: {
            $lte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      ],
    })
      .sort({
        liquidityUsd: 1,
        marketCapUsd: 1,
        updatedAt: 1,
      })
      .limit(BATCH_SIZE)
      .lean();

    for (const token of tokens) {
      try {
        const market = await fetchTokenMarketData(token.mintAddress);

        const newLiquidityUsd =
          market.metrics?.liquidityUsd ?? token.liquidityUsd ?? 0;

        const newVolume5mUsd =
          market.metrics?.volume5mUsd ?? token.volume5mUsd ?? 0;

        const newBuys5m =
          market.metrics?.buys5m ?? token.buys5m ?? 0;

        const newSells5m =
          market.metrics?.sells5m ?? token.sells5m ?? 0;

        await DiscoveredToken.findOneAndUpdate(
          { mintAddress: token.mintAddress },
          {
            pairAddress:
              market.token?.pairAddress || token.pairAddress,

            dexId:
              market.token?.dexId || token.dexId,

            pairCreatedAt:
              market.rawPair?.pairCreatedAt ||
              token.pairCreatedAt,

            name:
              market.token?.name || token.name,

            symbol:
              market.token?.symbol || token.symbol,

            ageMinutes:
              market.metrics?.ageMinutes ??
              token.ageMinutes,

            // Save previous values first
            previousLiquidityUsd:
              token.liquidityUsd ?? 0,

            previousVolume5mUsd:
              token.volume5mUsd ?? 0,

            previousBuys5m:
              token.buys5m ?? 0,

            previousSells5m:
              token.sells5m ?? 0,

            // Save latest values
            liquidityUsd:
              newLiquidityUsd,

            marketCapUsd:
              market.metrics?.marketCapUsd ??
              token.marketCapUsd,

            volume5mUsd:
              newVolume5mUsd,

            buys5m:
              newBuys5m,

            sells5m:
              newSells5m,

            boosted:
              market.metrics?.boosted ??
              token.boosted,

            lastSeenAt: new Date(),
          },
          { new: true }
        );
      } catch (err) {
        console.warn(
          "Discovered token refresh skipped:",
          token.symbol || token.mintAddress,
          err?.response?.status ||
            err?.message ||
            String(err)
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