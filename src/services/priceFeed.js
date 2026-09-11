const DEXSCREENER_BASE = "https://api.dexscreener.com";

/**
 * ===================================================
 * 📊 SIMPLE IN-MEMORY PRICE CACHE
 * ===================================================
 */
const priceCache = new Map(); // mint -> { value, expiresAt }
const marketSnapshotCache = new Map(); // mint -> { value, expiresAt }

const CACHE_TTL_MS = Number(process.env.PRICE_CACHE_TTL_MS || 15000);

/**
 * ===================================================
 * 🧹 HELPERS
 * ===================================================
 */
function now() {
  return Date.now();
}

function getCachedPrice(mint) {
  const hit = priceCache.get(mint);
  if (!hit) return null;
  if (hit.expiresAt <= now()) {
    priceCache.delete(mint);
    return null;
  }
  return hit.value;
}

function setCachedPrice(mint, value) {
  priceCache.set(mint, {
    value,
    expiresAt: now() + CACHE_TTL_MS,
  });
}

function getCachedMarketSnapshot(mint) {
  const hit = marketSnapshotCache.get(mint);

  if (!hit) return null;

  if (hit.expiresAt <= now()) {
    marketSnapshotCache.delete(mint);
    return null;
  }

  return hit.value;
}

function setCachedMarketSnapshot(mint, value) {
  marketSnapshotCache.set(mint, {
    value,
    expiresAt: now() + CACHE_TTL_MS,
  });
}

function buildMarketSnapshot(pair) {
  if (!pair) return null;

  const priceUsd = Number(pair.priceUsd || 0);
  const marketCapUsd = Number(pair.marketCap || 0);
  const liquidityUsd = Number(pair.liquidity?.usd || 0);

  return {
    priceUsd:
      Number.isFinite(priceUsd) && priceUsd > 0
        ? priceUsd
        : null,

    marketCapUsd:
      Number.isFinite(marketCapUsd) && marketCapUsd > 0
        ? marketCapUsd
        : null,

    liquidityUsd:
      Number.isFinite(liquidityUsd) && liquidityUsd > 0
        ? liquidityUsd
        : null,
  };
}

function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;

  // Prefer highest USD liquidity
  return pairs
    .filter(Boolean)
    .sort((a, b) => {
      const liqA = Number(a?.liquidity?.usd || 0);
      const liqB = Number(b?.liquidity?.usd || 0);
      return liqB - liqA;
    })[0];
}

/**
 * ===================================================
 * 📈 GET ONE TOKEN PRICE FROM DEXSCREENER
 * Uses token-pairs endpoint for Solana mint
 * ===================================================
 */
export async function getDexScreenerPrice(mint) {
  const cached = getCachedPrice(mint);
  if (cached != null) return cached;

  const url = `${DEXSCREENER_BASE}/token-pairs/v1/solana/${mint}`;
  const res = await fetch(url);

  if (res.status === 429) {
    const stale = priceCache.get(mint);
    if (stale?.value != null) {
      return stale.value;
    }
    throw new Error(`DexScreener rate limited (429) for mint ${mint}`);
  }

  if (!res.ok) {
    throw new Error(`DexScreener price fetch failed: ${res.status}`);
  }

  const pairs = await res.json();
  const best = pickBestPair(pairs);

  if (!best) {
    throw new Error(`No DexScreener pair found for mint ${mint}`);
  }

  const priceUsd = Number(best.priceUsd || 0);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error(`Invalid DexScreener price for mint ${mint}`);
  }

  setCachedPrice(mint, priceUsd);
  return priceUsd;
}

/**
 * ===================================================
 * 📊 GET ONE TOKEN MARKET SNAPSHOT
 * Returns price + market cap + liquidity
 * ===================================================
 */
export async function getDexScreenerMarketSnapshot(mint) {
  const cached = getCachedMarketSnapshot(mint);

  if (cached != null) {
    return cached;
  }

  const url = `${DEXSCREENER_BASE}/token-pairs/v1/solana/${mint}`;
  const res = await fetch(url);

  if (res.status === 429) {
    const stale = marketSnapshotCache.get(mint);

    if (stale?.value != null) {
      return stale.value;
    }

    throw new Error(
      `DexScreener rate limited (429) for market snapshot ${mint}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `DexScreener market snapshot fetch failed: ${res.status}`
    );
  }

  const pairs = await res.json();
  const best = pickBestPair(pairs);

  if (!best) {
    throw new Error(
      `No DexScreener pair found for market snapshot ${mint}`
    );
  }

  const snapshot = buildMarketSnapshot(best);

  if (!snapshot?.priceUsd) {
    throw new Error(
      `Invalid DexScreener market snapshot price for mint ${mint}`
    );
  }

  setCachedMarketSnapshot(mint, snapshot);

  return snapshot;
}


/**
 * ===================================================
 * 📈 GET MANY TOKEN PRICES FROM DEXSCREENER
 * Uses tokens endpoint (up to 30 token addresses)
 * ===================================================
 */
export async function getDexScreenerPrices(mints) {
  const result = new Map();

  const uncached = [];

  for (const mint of mints) {
    const cached = getCachedPrice(mint);

    if (cached != null) {
      result.set(mint, cached);
    } else {
      uncached.push(mint);
    }
  }

  if (uncached.length === 0) {
    return result;
  }

  // DexScreener supports up to 30 addresses per call
  for (let i = 0; i < uncached.length; i += 30) {
    const batch = uncached.slice(i, i + 30);
    const joined = batch.join(",");

    const url =
      `${DEXSCREENER_BASE}/tokens/v1/solana/${joined}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `DexScreener batch price fetch failed: ${res.status}`
      );
    }

    const rows = await res.json();

    const grouped = new Map();

    for (const row of rows || []) {
      const mint = row?.baseToken?.address;

      if (!mint) continue;

      if (!grouped.has(mint)) {
        grouped.set(mint, []);
      }

      grouped.get(mint).push(row);
    }

    for (const mint of batch) {
      const best = pickBestPair(
        grouped.get(mint) || []
      );

      const priceUsd = Number(best?.priceUsd || 0);

      if (
        Number.isFinite(priceUsd) &&
        priceUsd > 0
      ) {
        setCachedPrice(mint, priceUsd);
        result.set(mint, priceUsd);
      }
    }
  }

  return result;
}

/**
 * ===================================================
 * 📊 GET MANY TOKEN MARKET SNAPSHOTS
 * Returns price + market cap + liquidity
 * ===================================================
 */
export async function getDexScreenerMarketSnapshots(mints) {
  const result = new Map();

  const uncached = [];

  for (const mint of mints) {
    const cached = getCachedMarketSnapshot(mint);

    if (cached != null) {
      result.set(mint, cached);
    } else {
      uncached.push(mint);
    }
  }

  if (uncached.length === 0) {
    return result;
  }

  // DexScreener supports up to 30 addresses per call
  for (let i = 0; i < uncached.length; i += 30) {
    const batch = uncached.slice(i, i + 30);
    const joined = batch.join(",");

    const url =
      `${DEXSCREENER_BASE}/tokens/v1/solana/${joined}`;

    const res = await fetch(url);

    if (res.status === 429) {
      // Preserve any cached snapshot still available.
      for (const mint of batch) {
        const stale = marketSnapshotCache.get(mint);

        if (stale?.value != null) {
          result.set(mint, stale.value);
        }
      }

      continue;
    }

    if (!res.ok) {
      throw new Error(
        `DexScreener batch market snapshot fetch failed: ${res.status}`
      );
    }

    const rows = await res.json();

    const grouped = new Map();

    for (const row of rows || []) {
      const mint = row?.baseToken?.address;

      if (!mint) continue;

      if (!grouped.has(mint)) {
        grouped.set(mint, []);
      }

      grouped.get(mint).push(row);
    }

    for (const mint of batch) {
      const best = pickBestPair(
        grouped.get(mint) || []
      );

      const snapshot = buildMarketSnapshot(best);

      if (!snapshot?.priceUsd) {
        continue;
      }

      setCachedMarketSnapshot(mint, snapshot);

      result.set(mint, snapshot);
    }
  }

  return result;
}