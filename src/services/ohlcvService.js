import axios from "axios";

/**
 * Fetch OHLC candles for a Solana token using Dexscreener
 */
export async function fetchCandles(tokenMint, timeframe = "5m", limit = 100) {
  try {
    // Step 1: get pair from Dexscreener
    const pairRes = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`
    );

    const pair = pairRes.data?.pairs?.[0];
    if (!pair) {
      throw new Error("No trading pair found");
    }

    const pairAddress = pair.pairAddress;
    const chainId = pair.chainId;

    // Step 2: fetch candles
    const candleRes = await axios.get(
      `https://api.dexscreener.com/chart/${chainId}/${pairAddress}`,
      {
        params: {
          interval: timeframe, // 1m, 5m, 15m
          limit,
        },
      }
    );

    const raw = candleRes.data?.candles || [];

    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("No candle data returned");
    }

    // Normalize to your format
    const candles = raw.map((c) => ({
      time: c.t,
      open: Number(c.o),
      high: Number(c.h),
      low: Number(c.l),
      close: Number(c.c),
      volume: Number(c.v),
    }));

    return candles;
  } catch (error) {
    console.error("fetchCandles error:", error.message);
    throw error;
  }
}