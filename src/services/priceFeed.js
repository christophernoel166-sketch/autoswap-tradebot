const DEXSCREENER_BASE = "https://api.dexscreener.com";

/**
 * ===================================================
 * 🟣 SOLANA CONSTANTS
 * ===================================================
 */

/**
 * Wrapped SOL mint on Solana.
 *
 * Used to retrieve the current SOL/USD market price
 * from DexScreener.
 */
const SOL_MINT =
  "So11111111111111111111111111111111111111112";

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
 *
 * The cache is intentionally short-lived because this
 * service is used for live trading/position monitoring.
 * ===================================================
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
 * ===================================================
 * 💰 PRICE CACHE
 * ===================================================
 */

/**
 * Get a fresh cached token price.
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
 * Get a stale cached token price.
 *
 * This is intentionally separate from getCachedPrice().
 *
 * Why?
 *
 * When DexScreener returns 429, we still want to use
 * the most recently known price rather than returning
 * nothing.
 *
 * IMPORTANT:
 * This function does NOT delete expired entries.
 */
function getStalePrice(mint) {
  const hit = priceCache.get(mint);

  if (!hit) {
    return null;
  }

  return hit.value;
}

/**
 * Store token price in cache.
 */
function setCachedPrice(mint, value) {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return;
  }

  priceCache.set(mint, {
    value,
    expiresAt: now() + CACHE_TTL_MS,
  });
}

/**
 * ===================================================
 * 📊 MARKET SNAPSHOT CACHE
 * ===================================================
 */

/**
 * Get a fresh cached market snapshot.
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
 * Get stale market snapshot.
 *
 * Used specifically as a fallback during temporary
 * DexScreener rate limits.
 */
function getStaleMarketSnapshot(mint) {
  const hit = marketSnapshotCache.get(mint);

  if (!hit) {
    return null;
  }

  return hit.value;
}

/**
 * Store market snapshot in cache.
 */
function setCachedMarketSnapshot(mint, value) {
  if (!value) {
    return;
  }

  marketSnapshotCache.set(mint, {
    value,
    expiresAt: now() + CACHE_TTL_MS,
  });
}

/**
 * ===================================================
 * 📊 PRICE VALIDATION
 * ===================================================
 */

/**
 * Extract a valid USD price from a DexScreener pair.
 *
 * Returns:
 *   number
 *   OR
 *   null
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
 *
 * Returns:
 *
 * {
 *   priceUsd,
 *   marketCapUsd,
 *   liquidityUsd
 * }
 *
 * priceUsd is required for a usable snapshot.
 *
 * marketCapUsd and liquidityUsd may legitimately be
 * null when DexScreener does not provide valid values.
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
 * IMPORTANT:
 *
 * The previous implementation selected the pair with
 * the highest liquidity first.
 *
 * That created a problem when:
 *
 *   Pair A:
 *     highest liquidity
 *     priceUsd = null
 *
 *   Pair B:
 *     lower liquidity
 *     priceUsd = valid
 *
 * Pair A would be selected and the entire token could
 * end up without a usable USD price.
 *
 * NEW BEHAVIOR:
 *
 *   1. Remove pairs with invalid priceUsd.
 *   2. Among remaining pairs, select highest liquidity.
 *
 * This preserves the liquidity preference while making
 * sure the selected pair is actually usable.
 * ===================================================
 */

function pickBestPair(pairs) {
  if (
    !Array.isArray(pairs) ||
    pairs.length === 0
  ) {
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
    const liqA = Number(
      a?.liquidity?.usd || 0
    );

    const liqB = Number(
      b?.liquidity?.usd || 0
    );

    return liqB - liqA;
  })[0];
}

/**
 * ===================================================
 * 🧹 NORMALIZE MINTS
 * ===================================================
 *
 * Removes:
 *   - empty values
 *   - whitespace
 *   - duplicate mint addresses
 *
 * This prevents unnecessary DexScreener requests.
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
 * Endpoint:
 *
 *   /token-pairs/v1/solana/{mint}
 *
 * Returns:
 *
 *   number
 *
 * Example:
 *
 *   0.00005006
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
   * If DexScreener temporarily rate-limits us, use
   * the most recently known price if available.
   * ---------------------------------------------------
   */

  if (res.status === 429) {
    const stale = getStalePrice(mint);

    if (stale != null) {
      console.warn(
        `⚠️ DexScreener 429 for ${mint}; using stale price`
      );

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

  const priceUsd =
    getValidPriceUsd(best);

  if (priceUsd == null) {
    throw new Error(
      `Invalid DexScreener price for mint ${mint}`
    );
  }

  setCachedPrice(
    mint,
    priceUsd
  );

  return priceUsd;
}

/**
 * ===================================================
 * 🟣 GET SOL/USD PRICE
 * ===================================================
 *
 * Uses the wrapped SOL mint on Solana.
 *
 * Returns:
 *
 *   USD price of 1 SOL
 *
 * Example:
 *
 *   200.45
 *
 * This function is important for converting the
 * authoritative on-chain entryPriceSol into USD.
 *
 * Conversion:
 *
 *   entryPriceUsd =
 *     entryPriceSol * solPriceUsd
 * ===================================================
 */

export async function getSolPriceUsd() {
  const priceUsd =
    await getDexScreenerPrice(
      SOL_MINT
    );

  if (
    !Number.isFinite(priceUsd) ||
    priceUsd <= 0
  ) {
    throw new Error(
      `Invalid SOL/USD price from DexScreener: ${priceUsd}`
    );
  }

  return priceUsd;
}

/**
 * ===================================================
 * 📊 GET ONE TOKEN MARKET SNAPSHOT
 * ===================================================
 *
 * Endpoint:
 *
 *   /token-pairs/v1/solana/{mint}
 *
 * Returns:
 *
 * {
 *   priceUsd,
 *   marketCapUsd,
 *   liquidityUsd
 * }
 * ===================================================
 */

export async function getDexScreenerMarketSnapshot(
  mint
) {
  if (!mint) {
    throw new Error(
      "Mint address is required for DexScreener market snapshot"
    );
  }

  const cached =
    getCachedMarketSnapshot(mint);

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
    const stale =
      getStaleMarketSnapshot(mint);

    if (stale != null) {
      console.warn(
        `⚠️ DexScreener 429 for market snapshot ${mint}; using stale snapshot`
      );

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

  const best =
    pickBestPair(pairs);

  if (!best) {
    throw new Error(
      `No valid DexScreener pair found for market snapshot ${mint}`
    );
  }

  const snapshot =
    buildMarketSnapshot(best);

  if (!snapshot?.priceUsd) {
    throw new Error(
      `Invalid DexScreener market snapshot price for mint ${mint}`
    );
  }

  setCachedMarketSnapshot(
    mint,
    snapshot
  );

  return snapshot;
}

/**
 * ===================================================
 * 📈 GET MANY TOKEN PRICES FROM DEXSCREENER
 * ===================================================
 *
 * Endpoint:
 *
 *   /tokens/v1/solana/{mint1},{mint2},...
 *
 * Maximum:
 *
 *   30 addresses per request
 *
 * Returns:
 *
 *   Map<mint, priceUsd>
 * ===================================================
 */

export async function getDexScreenerPrices(
  mints
) {
  const normalizedMints =
    normalizeMints(mints);

  const result =
    new Map();

  if (
    normalizedMints.length === 0
  ) {
    return result;
  }

  const uncached = [];

  /**
   * ---------------------------------------------------
   * USE FRESH CACHE FIRST
   * ---------------------------------------------------
   */

  for (
    const mint of normalizedMints
  ) {
    const cached =
      getCachedPrice(mint);

    if (cached != null) {
      result.set(
        mint,
        cached
      );
    } else {
      uncached.push(mint);
    }
  }

  if (
    uncached.length === 0
  ) {
    return result;
  }

  /**
   * ---------------------------------------------------
   * PROCESS MAX 30 MINTS PER REQUEST
   * ---------------------------------------------------
   */

  for (
    let i = 0;
    i < uncached.length;
    i += 30
  ) {
    const batch =
      uncached.slice(i, i + 30);

    const joined =
      batch.join(",");

    const url =
      `${DEXSCREENER_BASE}/tokens/v1/solana/${joined}`;

    const res =
      await fetch(url);

    /**
     * -------------------------------------------------
     * 429 RATE LIMIT
     * -------------------------------------------------
     */

    if (res.status === 429) {
      for (
        const mint of batch
      ) {
        const stale =
          getStalePrice(mint);

        if (stale != null) {
          result.set(
            mint,
            stale
          );
        }
      }

      continue;
    }

    if (!res.ok) {
      throw new Error(
        `DexScreener batch price fetch failed: ${res.status}`
      );
    }

    const rows =
      await res.json();

    const grouped =
      new Map();

    /**
     * -------------------------------------------------
     * GROUP PAIRS BY TOKEN MINT
     * -------------------------------------------------
     */

    for (
      const row of rows || []
    ) {
      const mint =
        row?.baseToken?.address;

      if (!mint) {
        continue;
      }

      if (
        !grouped.has(mint)
      ) {
        grouped.set(
          mint,
          []
        );
      }

      grouped
        .get(mint)
        .push(row);
    }

    /**
     * -------------------------------------------------
     * SELECT BEST VALID PAIR
     * -------------------------------------------------
     */

    for (
      const mint of batch
    ) {
      const best =
        pickBestPair(
          grouped.get(mint) || []
        );

      if (!best) {
        continue;
      }

      const priceUsd =
        getValidPriceUsd(best);

      if (
        priceUsd == null
      ) {
        continue;
      }

      setCachedPrice(
        mint,
        priceUsd
      );

      result.set(
        mint,
        priceUsd
      );
    }
  }

  return result;
}

/**
 * ===================================================
 * 📊 GET MANY TOKEN MARKET SNAPSHOTS
 * ===================================================
 *
 * Endpoint:
 *
 *   /tokens/v1/solana/{mint1},{mint2},...
 *
 * Maximum:
 *
 *   30 addresses per request
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
 * ===================================================
 */

export async function getDexScreenerMarketSnapshots(
  mints
) {
  const normalizedMints =
    normalizeMints(mints);

  const result =
    new Map();

  if (
    normalizedMints.length === 0
  ) {
    return result;
  }

  const uncached = [];

  /**
   * ---------------------------------------------------
   * USE FRESH CACHE FIRST
   * ---------------------------------------------------
   */

  for (
    const mint of normalizedMints
  ) {
    const cached =
      getCachedMarketSnapshot(mint);

    if (cached != null) {
      result.set(
        mint,
        cached
      );
    } else {
      uncached.push(mint);
    }
  }

  if (
    uncached.length === 0
  ) {
    return result;
  }

  /**
   * ---------------------------------------------------
   * PROCESS MAX 30 MINTS PER REQUEST
   * ---------------------------------------------------
   */

  for (
    let i = 0;
    i < uncached.length;
    i += 30
  ) {
    const batch =
      uncached.slice(i, i + 30);

    const joined =
      batch.join(",");

    const url =
      `${DEXSCREENER_BASE}/tokens/v1/solana/${joined}`;

    const res =
      await fetch(url);

    /**
     * -------------------------------------------------
     * 429 RATE LIMIT
     * -------------------------------------------------
     *
     * Use stale snapshots where available instead of
     * returning an empty Map for those tokens.
     * -------------------------------------------------
     */

    if (res.status === 429) {
      console.warn(
        `⚠️ DexScreener market snapshot batch rate limited (429)`
      );

      for (
        const mint of batch
      ) {
        const stale =
          getStaleMarketSnapshot(mint);

        if (stale != null) {
          result.set(
            mint,
            stale
          );
        }
      }

      continue;
    }

    if (!res.ok) {
      throw new Error(
        `DexScreener batch market snapshot fetch failed: ${res.status}`
      );
    }

    const rows =
      await res.json();

    const grouped =
      new Map();

    /**
     * -------------------------------------------------
     * GROUP PAIRS BY TOKEN MINT
     * -------------------------------------------------
     */

    for (
      const row of rows || []
    ) {
      const mint =
        row?.baseToken?.address;

      if (!mint) {
        continue;
      }

      if (
        !grouped.has(mint)
      ) {
        grouped.set(
          mint,
          []
        );
      }

      grouped
        .get(mint)
        .push(row);
    }

    /**
     * -------------------------------------------------
     * BUILD MARKET SNAPSHOT FOR EACH TOKEN
     * -------------------------------------------------
     */

    for (
      const mint of batch
    ) {
      const best =
        pickBestPair(
          grouped.get(mint) || []
        );

      /**
       * No valid pair.
       *
       * Do not manufacture a price.
       */
      if (!best) {
        continue;
      }

      const snapshot =
        buildMarketSnapshot(best);

      /**
       * A market snapshot without a valid price is
       * not useful for entry/current USD calculations.
       *
       * market cap and liquidity can still be null.
       */
      if (
        !snapshot?.priceUsd
      ) {
        continue;
      }

      setCachedMarketSnapshot(
        mint,
        snapshot
      );

      result.set(
        mint,
        snapshot
      );
    }
  }

  return result;
}