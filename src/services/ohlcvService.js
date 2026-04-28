import axios from "axios";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const BIRDEYE_BASE_URL = "https://public-api.birdeye.so/defi/ohlcv";

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

function mapIntervalToBirdeye(interval) {
  switch (String(interval).toLowerCase()) {
    case "1m":
      return "1m";
    case "5m":
      return "5m";
    case "15m":
      return "15m";
    case "30m":
      return "30m";
    case "1h":
      return "1H";
    case "4h":
      return "4H";
    case "1d":
      return "1D";
    default:
      return "5m";
  }
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

async function fetchCandlesFromBirdeye(tokenMint, timeframe = "5m", limit = 100) {
  if (!BIRDEYE_API_KEY) {
    throw new Error("BIRDEYE_API_KEY missing");
  }

  const now = Math.floor(Date.now() / 1000);
  const interval = mapIntervalToBirdeye(timeframe);

  const secondsByTimeframe = {
    "1m": 60,
    "5m": 5 * 60,
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
    "4h": 4 * 60 * 60,
    "1d": 24 * 60 * 60,
  };

  const seconds = secondsByTimeframe[String(timeframe).toLowerCase()] || 5 * 60;
  const timeFrom = now - seconds * limit;

  const res = await axios.get(BIRDEYE_BASE_URL, {
    params: {
      address: tokenMint,
      type: interval,
      time_from: timeFrom,
      time_to: now,
    },
    headers: {
      accept: "application/json",
      "X-API-KEY": BIRDEYE_API_KEY,
      "x-chain": "solana",
    },
  });

  const items = res.data?.data?.items || [];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No Birdeye OHLCV candle data returned");
  }

  const candles = items
    .map((c) => ({
      time: Number(c.unixTime || c.t || c.time) * 1000,
      open: Number(c.o),
      high: Number(c.h),
      low: Number(c.l),
      close: Number(c.c),
      volume: Number(c.v || 0),
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
    throw new Error("No valid Birdeye candles after normalization");
  }

  console.log(
    "📈 Birdeye candles:",
    candles.length,
    "token:",
    tokenMint,
    "timeframe:",
    timeframe
  );

  return candles;
}

export async function fetchCandles(tokenMint, timeframe = "5m", limit = 100) {
  const cleanTokenMint = String(tokenMint || "").trim();

  if (!cleanTokenMint) {
    throw new Error("tokenMint is required");
  }

  try {
    const { timeframe: gtTimeframe, aggregate } = mapTimeframe(timeframe);

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

    const rawPoolId = String(bestPool.id);
    const poolAddress = rawPoolId.startsWith(`${NETWORK}_`)
      ? rawPoolId.slice(`${NETWORK}_`.length)
      : rawPoolId;

    if (!poolAddress) {
      throw new Error("Invalid GeckoTerminal pool id");
    }

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
  } catch (geckoError) {
    console.warn(
      "⚠️ GeckoTerminal candles failed, trying Birdeye fallback:",
      geckoError?.response?.status || "",
      geckoError?.response?.data || geckoError?.message || String(geckoError)
    );

    try {
      return await fetchCandlesFromBirdeye(
        cleanTokenMint,
        timeframe,
        limit
      );
    } catch (birdeyeError) {
      console.error(
        "fetchCandles error: both GeckoTerminal and Birdeye failed:",
        {
          gecko:
            geckoError?.response?.data ||
            geckoError?.message ||
            String(geckoError),
          birdeye:
            birdeyeError?.response?.data ||
            birdeyeError?.message ||
            String(birdeyeError),
        }
      );

      throw birdeyeError;
    }
  }
}