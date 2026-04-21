import axios from "axios";

const GECKO_BASE = "https://api.geckoterminal.com/api/v2";
const NETWORK = "solana";

function mapTimeframe(timeframe = "5m") {
  const tf = String(timeframe).toLowerCase();

  const mapping = {
    "1m": { timeframe: "minute", aggregate: 1 },
    "5m": { timeframe: "minute", aggregate: 5 },
    "15m": { timeframe: "minute", aggregate: 15 },
    "30m": { timeframe: "minute", aggregate: 30 },
    "1h": { timeframe: "hour", aggregate: 1 },
    "4h": { timeframe: "hour", aggregate: 4 },
    "1d": { timeframe: "day", aggregate: 1 },
  };

  return mapping[tf] || { timeframe: "minute", aggregate: 5 };
}

function pickBestPool(pools = []) {
  if (!Array.isArray(pools) || pools.length === 0) return null;

  const sorted = [...pools].sort((a, b) => {
    const aReserve = Number(a?.attributes?.reserve_in_usd || 0);
    const bReserve = Number(b?.attributes?.reserve_in_usd || 0);

    if (bReserve !== aReserve) return bReserve - aReserve;

    const aVol = Number(a?.attributes?.volume_usd?.h24 || 0);
    const bVol = Number(b?.attributes?.volume_usd?.h24 || 0);

    return bVol - aVol;
  });

  return sorted[0] || null;
}

/**
 * Fetch OHLC candles for a Solana token using GeckoTerminal
 */
export async function fetchCandles(tokenMint, timeframe = "5m", limit = 100) {
  try {
    const cleanTokenMint = String(tokenMint || "").trim();
    if (!cleanTokenMint) {
      throw new Error("tokenMint is required");
    }

    const { timeframe: gtTimeframe, aggregate } = mapTimeframe(timeframe);

    // 1) Find pools for token
    const poolsRes = await axios.get(
      `${GECKO_BASE}/networks/${NETWORK}/tokens/${cleanTokenMint}/pools`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const pools = poolsRes.data?.data || [];
    const bestPool = pickBestPool(pools);

    if (!bestPool?.id) {
      throw new Error("No GeckoTerminal pool found");
    }

    // GeckoTerminal ids often look like: solana_<poolAddress>
    const rawPoolId = String(bestPool.id);
    const poolAddress = rawPoolId.startsWith(`${NETWORK}_`)
      ? rawPoolId.slice(`${NETWORK}_`.length)
      : rawPoolId;

    if (!poolAddress) {
      throw new Error("Invalid GeckoTerminal pool id");
    }

    // 2) Fetch OHLCV
    const ohlcvRes = await axios.get(
      `${GECKO_BASE}/networks/${NETWORK}/pools/${poolAddress}/ohlcv/${gtTimeframe}`,
      {
        params: {
          aggregate,
          limit,
          currency: "usd",
        },
        headers: {
          Accept: "application/json",
        },
      }
    );

    const list =
      ohlcvRes.data?.data?.attributes?.ohlcv_list ||
      ohlcvRes.data?.data?.attributes?.ohlcv ||
      [];

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("No OHLCV candle data returned");
    }

    const candles = list
      .map((c) => ({
        time: Number(c[0]) * 1000,
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        close: Number(c[4]),
        volume: Number(c[5] || 0),
      }))
      .filter(
        (c) =>
          Number.isFinite(c.time) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      )
      .sort((a, b) => a.time - b.time);

    if (!candles.length) {
      throw new Error("No valid candles after normalization");
    }

    console.log(
      "📈 GeckoTerminal candles:",
      candles.length,
      "token:",
      cleanTokenMint,
      "pool:",
      poolAddress,
      "timeframe:",
      timeframe
    );

    return candles;
  } catch (error) {
    console.error(
      "fetchCandles error:",
      error?.response?.status || "",
      error?.response?.data || error?.message || String(error)
    );
    throw error;
  }
}