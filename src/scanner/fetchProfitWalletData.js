// src/scanner/fetchProfitWalletData.js

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

/**
 * Phase 1: Profit wallet tracking
 *
 * This version is heuristic-based.
 * It uses holder distribution + existing wallet intelligence signals
 * to estimate whether the current token is attracting stronger wallets.
 *
 * Later upgrades can plug in:
 * - historical wallet PnL
 * - cross-token win rate
 * - realized profit tracking
 * - per-wallet quality database
 */
export async function fetchProfitWalletData({
  tokenMint,
  holderData = {},
  walletIntel = {},
  market = {},
  context = {},
} = {}) {
  try {
    const warnings = [];

    const topHolders = safeArray(holderData?.topHolders);
    const largestHolderPercent = toNumber(holderData?.largestHolderPercent, 0);
    const top10HoldingPercent = toNumber(holderData?.top10HoldingPercent, 0);

    const smartDegenCount = toNumber(walletIntel?.smartDegenCount, 0);
    const botDegenCount = toNumber(walletIntel?.botDegenCount, 0);
    const ratTraderCount = toNumber(walletIntel?.ratTraderCount, 0);
    const sniperWalletCount = toNumber(walletIntel?.sniperWalletCount, 0);

    const liquidityUsd = toNumber(market?.metrics?.liquidityUsd, 0);
    const volume5mUsd = toNumber(market?.metrics?.volume5mUsd, 0);
    const buys5m = toNumber(market?.metrics?.buys5m, 0);
    const sells5m = toNumber(market?.metrics?.sells5m, 0);

    let profitableWalletCount = 0;
    let walletQualityScore = 0;
    let profitWalletConfidence = 0;

    // ---------------------------------------------------
    // Profit wallet count heuristic
    // ---------------------------------------------------
    profitableWalletCount += smartDegenCount * 2;

    if (smartDegenCount >= 3) {
      walletQualityScore += 25;
    } else if (smartDegenCount >= 1) {
      walletQualityScore += 12;
    }

    if (botDegenCount === 0) {
      walletQualityScore += 10;
    } else if (botDegenCount <= 2) {
      walletQualityScore += 4;
    } else {
      walletQualityScore -= 8;
      warnings.push("Bot-like wallet activity reduces wallet quality");
    }

    if (ratTraderCount === 0) {
      walletQualityScore += 8;
    } else if (ratTraderCount <= 2) {
      walletQualityScore += 3;
    } else {
      walletQualityScore -= 6;
      warnings.push("Rat-trader activity reduces wallet quality");
    }

    if (sniperWalletCount <= 3) {
      walletQualityScore += 8;
    } else if (sniperWalletCount <= 6) {
      walletQualityScore += 3;
    } else {
      walletQualityScore -= 8;
      warnings.push("High sniper concentration reduces wallet quality");
    }

    // ---------------------------------------------------
    // Holder distribution influence
    // ---------------------------------------------------
    if (largestHolderPercent <= 3) {
      walletQualityScore += 12;
    } else if (largestHolderPercent <= 5) {
      walletQualityScore += 6;
    } else if (largestHolderPercent > 10) {
      walletQualityScore -= 12;
      warnings.push("Single-wallet dominance reduces confidence");
    }

    if (top10HoldingPercent <= 20) {
      walletQualityScore += 10;
    } else if (top10HoldingPercent <= 30) {
      walletQualityScore += 4;
    } else {
      walletQualityScore -= 8;
      warnings.push("Top 10 concentration reduces wallet quality");
    }

    // ---------------------------------------------------
    // Market context influence
    // ---------------------------------------------------
    const totalTx = buys5m + sells5m;
    const buyPressure = totalTx > 0 ? buys5m / totalTx : 0;

    if (liquidityUsd >= 30000) {
      walletQualityScore += 6;
    }

    if (volume5mUsd >= 10000) {
      walletQualityScore += 6;
    }

    if (buyPressure >= 0.6 && buys5m >= 30) {
      walletQualityScore += 8;
      profitableWalletCount += 1;
    }

    if (buyPressure < 0.4 && sells5m >= 30) {
      walletQualityScore -= 6;
      warnings.push("Heavy sell pressure weakens profit-wallet confidence");
    }

    // ---------------------------------------------------
    // Confidence score
    // ---------------------------------------------------
    profitWalletConfidence =
      walletQualityScore +
      profitableWalletCount * 4;

    walletQualityScore = clamp(Math.round(walletQualityScore), 0, 100);
    profitWalletConfidence = clamp(
      Math.round(profitWalletConfidence),
      0,
      100
    );

    if (profitableWalletCount >= 8) {
      warnings.push("Strong profit-wallet presence detected");
    }

    return {
      tokenMint: tokenMint || null,
      profitableWalletCount,
      walletQualityScore,
      profitWalletConfidence,
      profitWalletWarning: warnings.length
        ? [...new Set(warnings)].join(" | ")
        : null,
    };
  } catch (err) {
    console.error("fetchProfitWalletData error:", err);

    return {
      tokenMint: tokenMint || null,
      profitableWalletCount: 0,
      walletQualityScore: 0,
      profitWalletConfidence: 0,
      profitWalletWarning: "Profit wallet tracking failed",
    };
  }
}