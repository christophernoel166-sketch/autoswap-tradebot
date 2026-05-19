import express from "express";
import axios from "axios";
import { fetchTokenMarketData } from "../../scanner/fetchTokenMarketData.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const response = await axios.get(
      "https://api.dexscreener.com/token-boosts/top/v1",
      {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "AutoswapsBot/1.0",
        },
      }
    );

    const metas = Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];

    const solanaItems = metas
      .filter((item) => item?.chainId === "solana")
      .slice(0, 50);

    const tokens = await Promise.all(
      solanaItems.map(async (item) => {
        const mintAddress =
          item.tokenAddress ||
          item.address ||
          item.baseToken?.address ||
          item.token?.address;

        if (!mintAddress) return null;

        try {
          const market = await fetchTokenMarketData(mintAddress);

          return {
            chainId: "solana",
            mintAddress,
            pairAddress: market.token?.pairAddress || null,
            dexId: market.token?.dexId || null,

            name:
              market.token?.name ||
              item.description ||
              "Trending Token",

            symbol:
              market.token?.symbol ||
              item.symbol ||
              "UNKNOWN",

            icon: item.icon || null,
            url: item.url || null,
            links: item.links || [],

            ageMinutes: market.metrics?.ageMinutes ?? null,
            liquidityUsd: market.metrics?.liquidityUsd ?? null,
            marketCapUsd: market.metrics?.marketCapUsd ?? null,
            volume5mUsd: market.metrics?.volume5mUsd ?? null,
            buys5m: market.metrics?.buys5m ?? null,
            sells5m: market.metrics?.sells5m ?? null,
            boosted: market.metrics?.boosted || false,
          };
        } catch (err) {
          console.warn(
            "Trending token market fetch failed:",
            mintAddress,
            err?.message
          );

          return null;
        }
      })
    );

    const cleanTokens = tokens
      .filter(Boolean)
      .filter((t) => Number(t.liquidityUsd || 0) > 0);

    return res.status(200).json({
      ok: true,
      type: "trending",
      count: cleanTokens.length,
      tokens: cleanTokens,
    });
  } catch (error) {
    console.error("GET /api/trending-tokens error:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to fetch trending tokens",
      details: error?.message || String(error),
    });
  }
});

export default router;