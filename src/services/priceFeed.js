const DEXSCREENER_BASE = "https://api.dexscreener.com";

/**
 * ===================================================
 * 📊 SIMPLE IN-MEMORY PRICE CACHE
 * ===================================================
 *
 * priceCache:
 *   mint -> { value, expiresAt }
 *
 * marketSnapshotCache:
 *   mint -> { value, expiresAt }
 */
const priceCache = new Map();
const marketSnapshotCache = new Map();

const CACHE_TTL_MS = Number(
  process.env.PRICE_CACHE_TTL_MS || 15000
);

/**
 * ===================================================
 * 🧹 HELPERS
 * ===================================================
 */

function now() {
  return Date.now();
}

/**
 * ---------------------------------------------------
 * Fresh price cache
 * ---------------------------------------------------
 */
function getCachedPrice(mint) {
  const hit = priceCache.get(mint);

  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= now()) {
    priceCache.delete(mint);
    return null;
  }

  return hit.value;
}

/**
 * ---------------------------------------------------
 * Stale price cache
 *
 * Used specifically when DexScreener is temporarily
 * rate limited.
 *
 * IMPORTANT:
 * We intentionally do NOT delete expired cache here.
 * ---------------------------------------------------
 */
function getStalePrice(mint) {
  const hit = priceCache.get(mint);

  if (!hit) {
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

/**
 * ---------------------------------------------------
 * Fresh market snapshot cache
 * ---------------------------------------------------
 */
function getCachedMarketSnapshot(mint) {
  const hit = marketSnapshotCache.get(mint);

  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= now()) {
    marketSnapshotCache.delete(mint);
    return null;
  }

  return hit.value;
}

/**
 * ---------------------------------------------------
 * Stale market snapshot cache
 *
 * Used specifically when DexScreener is temporarily
 * rate limited.
 *
 * IMPORTANT:
 * We intentionally do NOT delete expired cache here.
 * ---------------------------------------------------
 */
function getStaleMarketSnapshot(mint) {
  const hit = marketSnapshotCache.get(mint);

  if (!hit) {
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

/**
 * ===================================================
 * 📊 PAIR VALIDATION
 * ===================================================
 */

function getValidPriceUsd(pair) {
  const priceUsd = Number(pair?.priceUsd);

  if (
    !Number.isFinite(priceUsd) ||
    priceUsd <= 0
  ) {
    return null;
  }

  return priceUsd;
}

/**
 * ===================================================
 * 📊 BUILD MARKET SNAPSHOT
 * ===================================================
 */

function buildMarketSnapshot(pair) {
  if (!pair) {
    return null;
  }

  const priceUsd = Number(pair.priceUsd);
  const marketCapUsd = Number(pair.marketCap);
  const liquidityUsd = Number(pair.liquidity?.usd);

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

/**
 * ===================================================
 * 🔎 PICK BEST PAIR
 * ===================================================
 *
 * IMPORTANT FIX:
 *
 * Previously the code selected the highest-liquidity
 * pair FIRST and only afterward checked whether that
 * pair had a valid priceUsd.
 *
 * That could produce:
 *
 *   Pair A -> highest liquidity, priceUsd = null
 *   Pair B -> lower liquidity, priceUsd = valid
 *
 * Result:
 *   Pair A selected
 *   snapshot rejected
 *   token gets no price
 *
 * We now:
 *
 *   1. Filter out pairs without a valid USD price.
 *   2. Among valid pairs, select the highest liquidity.
 *
 * This preserves the original "highest liquidity"
 * preference while ensuring the selected pair is usable.
 * ===================================================
 */

function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return null;
  }

  const validPairs = pairs
    .filter(Boolean)
    .filter((pair) => {
      return getValidPriceUsd(pair) != null;
    });

  if (validPairs.length === 0) {
    return null;
  }

  return validPairs.sort((a, b) => {
    const liqA = Number(a?.liquidity?.usd || 0);
    const liqB = Number(b?.liquidity?.usd || 0);

    return liqB - liqA;
  })[0];
}

/**
 * ===================================================
 * 🧹 NORMALIZE MINTS
 * ===================================================
 *
 * Prevent duplicate addresses from being sent to
 * DexScreener in the same batch.
 * ===================================================
 */

function normalizeMints(mints) {
  if (!Array.isArray(mints)) {
    return [];
  }

  return [
    ...new Set(
      mints
        .filter(Boolean)
        .map((mint) => String(mint).trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * ===================================================
 * 📈 GET ONE TOKEN PRICE FROM DEXSCREENER
 * ===================================================
 *
 * Uses:
 *   /token-pairs/v1/solana/{mint}
 *
 * Returns:
 *   number
 * ===================================================
 */

export async function getDexScreenerPrice(mint) {
  if (!mint) {
    throw new Error(
      "Mint address is required for DexScreener price fetch"
    );
  }

  const cached = getCachedPrice(mint);

  if (cached != null) {
    return cached;
  }

  const url =
    `${DEXSCREENER_BASE}/token-pairs/v1/solana/${mint}`;

  const res = await fetch(url);

  /**
   * ---------------------------------------------------
   * 429 RATE LIMIT
   * ---------------------------------------------------
   *
   * IMPORTANT:
   * Use stale cache if available.
   *
   * This prevents a temporary DexScreener rate limit
   * from completely destroying price availability.
   * ---------------------------------------------------
   */

  if (res.status === 429) {
    const stale = getStalePrice(mint);

    if (stale != null) {
      return stale;
    }

    throw new Error(
      `DexScreener rate limited (429) for mint ${mint}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `DexScreener price fetch failed: ${res.status}`
    );
  }

  const pairs = await res.json();

  const best = pickBestPair(pairs);

  if (!best) {
    throw new Error(
      `No valid DexScreener pair found for mint ${mint}`
    );
  }

  const priceUsd = getValidPriceUsd(best);

  if (priceUsd == null) {
    throw new Error(
      `Invalid DexScreener price for mint ${mint}`
    );
  }

  setCachedPrice(mint, priceUsd);

  return priceUsd;
}

/**
 * ===================================================
 * 📊 GET ONE TOKEN MARKET SNAPSHOT
 * ===================================================
 *
 * Returns:
 *
 * {
 *   priceUsd,
 *   marketCapUsd,
 *   liquidityUsd
 * }
 *
 * Uses:
 *   /token-pairs/v1/solana/{mint}
 * ===================================================
 */

export async function getDexScreenerMarketSnapshot(mint) {
  if (!mint) {
    throw new Error(
      "Mint address is required for DexScreener market snapshot"
    );
  }

  const cached = getCachedMarketSnapshot(mint);

  if (cached != null) {
    return cached;
  }

  const url =
    `${DEXSCREENER_BASE}/token-pairs/v1/solana/${mint}`;

  const res = await fetch(url);

  /**
   * ---------------------------------------------------
   * 429 RATE LIMIT
   * ---------------------------------------------------
   */

  if (res.status === 429) {
    const stale = getStaleMarketSnapshot(mint);

    if (stale != null) {
      return stale;
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
      `No valid DexScreener pair found for market snapshot ${mint}`
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
 * ===================================================
 *
 * Uses:
 *   /tokens/v1/solana/{mint1},{mint2},...
 *
 * Maximum:
 *   30 addresses per request
 *
 * Returns:
 *   Map<mint, priceUsd>
 * ===================================================
 */

export async function getDexScreenerPrices(mints) {
  const normalizedMints = normalizeMints(mints);

  const result = new Map();

  if (normalizedMints.length === 0) {
    return result;
  }

  const uncached = [];

  /**
   * ---------------------------------------------------
   * FIRST: use fresh cache
   * ---------------------------------------------------
   */

  for (const mint of normalizedMints) {
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

  /**
   * ---------------------------------------------------
   * BATCH REQUESTS
   * ---------------------------------------------------
   */

  for (let i = 0; i < uncached.length; i += 30) {
    const batch = uncached.slice(i, i + 30);
    const joined = batch.join(",");

    const url =
      `${DEXSCREENER_BASE}/tokens/v1/solana/${joined}`;

    const res = await fetch(url);

    /**
     * -------------------------------------------------
     * 429 RATE LIMIT
     * -------------------------------------------------
     *
     * Do not throw away all price information.
     *
     * Try stale cache for each mint in this batch.
     * -------------------------------------------------
     */

    if (res.status === 429) {
      for (const mint of batch) {
        const stale = getStalePrice(mint);

        if (stale != null) {
          result.set(mint, stale);
        }
      }

      continue;
    }

    if (!res.ok) {
      throw new Error(
        `DexScreener batch price fetch failed: ${res.status}`
      );
    }

    const rows = await res.json();

    const grouped = new Map();

    /**
     * -------------------------------------------------
     * GROUP PAIRS BY TOKEN MINT
     * -------------------------------------------------
     */

    for (const row of rows || []) {
      const mint = row?.baseToken?.address;

      if (!mint) {
        continue;
      }

      if (!grouped.has(mint)) {
        grouped.set(mint, []);
      }

      grouped.get(mint).push(row);
    }

    /**
     * -------------------------------------------------
     * SELECT BEST VALID PAIR FOR EACH TOKEN
     * -------------------------------------------------
     */

    for (const mint of batch) {
      const best = pickBestPair(
        grouped.get(mint) || []
      );

      if (!best) {
        continue;
      }

      const priceUsd = getValidPriceUsd(best);

      if (priceUsd == null) {
        continue;
      }

      setCachedPrice(mint, priceUsd);

      result.set(mint, priceUsd);
    }
  }

  return result;
}

/**
 * ===================================================
 * 📊 GET MANY TOKEN MARKET SNAPSHOTS
 * ===================================================
 *
 * Returns:
 *
 * Map<
 *   mint,
 *   {
 *     priceUsd,
 *     marketCapUsd,
 *     liquidityUsd
 *   }
 * >
 *
 * Uses:
 *   /tokens/v1/solana/{mint1},{mint2},...
 *
 * Maximum:
 *   30 addresses per request
 * ===================================================
 */

export async function getDexScreenerMarketSnapshots(mints) {
  const normalizedMints = normalizeMints(mints);

  const result = new Map();

  if (normalizedMints.length === 0) {
    return result;
  }

  const uncached = [];

  /**
   * ---------------------------------------------------
   * FIRST: use fresh cache
   * ---------------------------------------------------
   */

  for (const mint of normalizedMints) {
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

  /**
   * ---------------------------------------------------
   * BATCH REQUESTS
   * ---------------------------------------------------
   */

  for (let i = 0; i < uncached.length; i += 30) {
    const batch = uncached.slice(i, i + 30);
    const joined = batch.join(",");

    const url =
      `${DEXSCREENER_BASE}/tokens/v1/solana/${joined}`;

    const res = await fetch(url);

    /**
     * -------------------------------------------------
     * 429 RATE LIMIT
     * -------------------------------------------------
     *
     * IMPORTANT FIX:
     *
     * Previously:
     *
     *   getCachedMarketSnapshot()
     *       ↓
     *   expired entry deleted
     *       ↓
     *   request gets 429
     *       ↓
     *   marketSnapshotCache.get()
     *       ↓
     *   nothing available
     *
     * Now we explicitly retrieve stale cache without
     * deleting it.
     * -------------------------------------------------
     */

    if (res.status === 429) {
      for (const mint of batch) {
        const stale = getStaleMarketSnapshot(mint);

        if (stale != null) {
          result.set(mint, stale);
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

    /**
     * -------------------------------------------------
     * GROUP PAIRS BY TOKEN MINT
     * -------------------------------------------------
     */

    for (const row of rows || []) {
      const mint = row?.baseToken?.address;

      if (!mint) {
        continue;
      }

      if (!grouped.has(mint)) {
        grouped.set(mint, []);
      }

      grouped.get(mint).push(row);
    }

    /**
     * -------------------------------------------------
     * BUILD SNAPSHOT FOR EACH TOKEN
     * -------------------------------------------------
     */

    for (const mint of batch) {
      const best = pickBestPair(
        grouped.get(mint) || []
      );

      /**
       * No usable pair.
       *
       * Do not create a fake snapshot.
       */
      if (!best) {
        continue;
      }

      const snapshot = buildMarketSnapshot(best);

      /**
       * Price is mandatory for a usable market snapshot.
       *
       * marketCap and liquidity are allowed to be null.
       */
      if (!snapshot?.priceUsd) {
        continue;
      }

      setCachedMarketSnapshot(mint, snapshot);

      result.set(mint, snapshot);
    }
  }

  return result;
}