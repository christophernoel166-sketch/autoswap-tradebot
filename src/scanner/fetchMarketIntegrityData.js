// src/scanner/fetchMarketIntegrityData.js

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueCount(items, selector) {
  const set = new Set();

  for (const item of items) {
    const value = selector(item);
    if (value !== null && value !== undefined && value !== "") {
      set.add(String(value));
    }
  }

  return set.size;
}

/**
 * Expected optional inputs:
 *
 * market = {
 *   metrics: {
 *     buys5m,
 *     sells5m,
 *     volume5mUsd,
 *     ageMinutes,
 *     liquidityUsd,
 *     marketCapUsd
 *   }
 * }
 *
 * context = {
 *   recentTrades: [
 *     {
 *       side: "buy" | "sell",
 *       wallet: "abc...",
 *       amountUsd: 123,
 *       timestamp: 1710000000000
 *     }
 *   ]
 * }
 *
 * Notes:
 * - If recentTrades is unavailable, this falls back to market-level heuristics.
 * - This is intentionally conservative for the first version.
 */
export async function fetchMarketIntegrityData({
  tokenMint,
  market = {},
  context = {},
} = {}) {
  const warnings = [];

  const metrics = market?.metrics || {};
  const recentTrades = safeArray(context?.recentTrades);

  const buys5m = toNumber(metrics?.buys5m, 0);
  const sells5m = toNumber(metrics?.sells5m, 0);
  const volume5mUsd = toNumber(metrics?.volume5mUsd, 0);
  const ageMinutes = toNumber(metrics?.ageMinutes, 0);
  const liquidityUsd = toNumber(metrics?.liquidityUsd, 0);

  const totalTx5m = buys5m + sells5m;
  const buySellRatio5m =
    sells5m > 0 ? buys5m / sells5m : buys5m > 0 ? buys5m : 0;

  // ---------------------------------------------------
  // Wallet participation
  // ---------------------------------------------------
  const buyTrades = recentTrades.filter(
    (t) => String(t?.side || "").toLowerCase() === "buy"
  );
  const sellTrades = recentTrades.filter(
    (t) => String(t?.side || "").toLowerCase() === "sell"
  );

  const uniqueBuyerCount5m = uniqueCount(buyTrades, (t) => t?.wallet);
  const uniqueSellerCount5m = uniqueCount(sellTrades, (t) => t?.wallet);

  const recentTradesAvailable = recentTrades.length > 0;

  // Fallback approximations if wallet-level trades are not available yet
  const approximatedUniqueBuyerCount5m = recentTradesAvailable
    ? uniqueBuyerCount5m
    : Math.max(1, Math.min(buys5m, Math.round(buys5m * 0.35)));

  const approximatedUniqueSellerCount5m = recentTradesAvailable
    ? uniqueSellerCount5m
    : Math.max(1, Math.min(sells5m, Math.round(sells5m * 0.4)));

  const walletParticipationRatio =
    totalTx5m > 0
      ? (approximatedUniqueBuyerCount5m + approximatedUniqueSellerCount5m) /
        totalTx5m
      : 0;

  // ---------------------------------------------------
  // Artificial volume / wash-style heuristics
  // ---------------------------------------------------
  const volumePerTx5m = totalTx5m > 0 ? volume5mUsd / totalTx5m : 0;

  const volumePerUniqueBuyer5m =
    approximatedUniqueBuyerCount5m > 0
      ? volume5mUsd / approximatedUniqueBuyerCount5m
      : volume5mUsd;

  let washTradingRiskScore = 0;

  // 1. Heavy tx count but weak unique participation
  if (totalTx5m >= 25 && walletParticipationRatio < 0.45) {
    washTradingRiskScore += 20;
    warnings.push("Transaction activity is concentrated across few wallets");
  }

  if (totalTx5m >= 40 && walletParticipationRatio < 0.35) {
    washTradingRiskScore += 20;
  }

  // 2. Very strong buy pressure without broad participation
  if (
    buySellRatio5m >= 3 &&
    approximatedUniqueBuyerCount5m <= Math.max(3, Math.round(buys5m * 0.2))
  ) {
    washTradingRiskScore += 15;
    warnings.push("Buy pressure looks stronger than wallet participation");
  }

  // 3. High volume with too few buyers
  if (volume5mUsd >= 15000 && volumePerUniqueBuyer5m >= 4000) {
    washTradingRiskScore += 15;
    warnings.push("Volume per buyer is unusually high");
  }

  if (volume5mUsd >= 30000 && volumePerUniqueBuyer5m >= 7000) {
    washTradingRiskScore += 15;
  }

  // 4. Very young token + huge activity burst can be suspicious
  if (ageMinutes > 0 && ageMinutes <= 8 && totalTx5m >= 40 && volume5mUsd >= 12000) {
    washTradingRiskScore += 10;
    warnings.push("Early activity burst may be artificial");
  }

  // 5. Thin liquidity with aggressive activity
  if (liquidityUsd > 0 && liquidityUsd < 20000 && volume5mUsd > liquidityUsd * 1.2) {
    washTradingRiskScore += 15;
    warnings.push("Volume is high relative to available liquidity");
  }

  washTradingRiskScore = clamp(Math.round(washTradingRiskScore), 0, 100);

  const artificialVolumeFlag = washTradingRiskScore >= 55;

  // ---------------------------------------------------
  // Wallet participation score
  // Higher is better
  // ---------------------------------------------------
  let walletParticipationScore = 50;

  if (walletParticipationRatio >= 0.8) walletParticipationScore = 95;
  else if (walletParticipationRatio >= 0.7) walletParticipationScore = 88;
  else if (walletParticipationRatio >= 0.6) walletParticipationScore = 80;
  else if (walletParticipationRatio >= 0.5) walletParticipationScore = 70;
  else if (walletParticipationRatio >= 0.4) walletParticipationScore = 58;
  else if (walletParticipationRatio >= 0.3) walletParticipationScore = 45;
  else if (walletParticipationRatio >= 0.2) walletParticipationScore = 30;
  else walletParticipationScore = 18;

  if (!recentTradesAvailable) {
    walletParticipationScore = Math.max(20, walletParticipationScore - 8);
    warnings.push("Wallet participation score is using fallback estimation");
  }

  walletParticipationScore = clamp(walletParticipationScore, 0, 100);

  // ---------------------------------------------------
  // Velocity sanity score
  // Higher is better
  // ---------------------------------------------------
  let velocitySanityScore = 80;

  if (buySellRatio5m >= 6 && walletParticipationRatio < 0.35) {
    velocitySanityScore -= 30;
  } else if (buySellRatio5m >= 4 && walletParticipationRatio < 0.45) {
    velocitySanityScore -= 22;
  } else if (buySellRatio5m >= 3 && walletParticipationRatio < 0.5) {
    velocitySanityScore -= 15;
  }

  if (ageMinutes <= 5 && totalTx5m >= 50) {
    velocitySanityScore -= 10;
  }

  if (volumePerTx5m > 0 && volumePerTx5m < 40 && totalTx5m >= 50) {
    velocitySanityScore -= 12;
    warnings.push("High transaction count with very small trade sizes");
  }

  if (artificialVolumeFlag) {
    velocitySanityScore -= 20;
  }

  velocitySanityScore = clamp(Math.round(velocitySanityScore), 0, 100);

  // ---------------------------------------------------
  // Bundle suspicion proxy
  // Higher means more suspicious
  // ---------------------------------------------------
  let bundleSuspicionScore = 0;

  if (walletParticipationRatio < 0.35 && totalTx5m >= 20) {
    bundleSuspicionScore += 25;
  }

  if (buySellRatio5m >= 4 && approximatedUniqueBuyerCount5m <= 5) {
    bundleSuspicionScore += 20;
  }

  if (ageMinutes <= 10 && totalTx5m >= 30 && approximatedUniqueBuyerCount5m <= 6) {
    bundleSuspicionScore += 15;
  }

  bundleSuspicionScore = clamp(Math.round(bundleSuspicionScore), 0, 100);

  // ---------------------------------------------------
  // Fake momentum flag
  // ---------------------------------------------------
  const fakeMomentumFlag =
    (buySellRatio5m >= 4 && walletParticipationScore <= 45) ||
    (artificialVolumeFlag && velocitySanityScore <= 45);

  if (fakeMomentumFlag) {
    warnings.push("Momentum may be driven by artificial activity");
  }

  return {
    tokenMint: tokenMint || null,

    buys5m,
    sells5m,
    totalTx5m,
    buySellRatio5m: Number(buySellRatio5m.toFixed(2)),

    uniqueBuyerCount5m: approximatedUniqueBuyerCount5m,
    uniqueSellerCount5m: approximatedUniqueSellerCount5m,
    walletParticipationRatio: Number(walletParticipationRatio.toFixed(2)),
    walletParticipationScore,

    volumePerTx5m: Number(volumePerTx5m.toFixed(2)),
    volumePerUniqueBuyer5m: Number(volumePerUniqueBuyer5m.toFixed(2)),

    velocitySanityScore,
    washTradingRiskScore,
    bundleSuspicionScore,

    artificialVolumeFlag,
    fakeMomentumFlag,

    integrityWarning: warnings.length ? warnings.join(" | ") : null,
  };
}