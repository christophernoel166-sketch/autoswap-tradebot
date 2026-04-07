// src/scanner/fetchWalletIntelligenceData.js

/**
 * Wallet Intelligence Engine (Phase 1)
 *
 * This version uses:
 * - holder distribution
 * - concentration patterns
 * - simple heuristics
 *
 * Later upgrades:
 * - track profitable wallets
 * - historical PnL scoring
 * - cross-token wallet tracking
 */

export async function fetchWalletIntelligenceData({
  tokenMint,
  holderData = {},
  market = {},
  context = {},
} = {}) {
  try {
    const warnings = [];

    const topHolders = holderData?.topHolders || [];

    if (!Array.isArray(topHolders) || topHolders.length === 0) {
      return {
        smartDegenCount: 0,
        botDegenCount: 0,
        ratTraderCount: 0,
        sniperWalletCount: 0,
        walletIntelligenceWarning: "No holder data available",
      };
    }

    let smartDegenCount = 0;
    let botDegenCount = 0;
    let ratTraderCount = 0;
    let sniperWalletCount = 0;

    // ============================================
    // 🧠 BASIC WALLET CLASSIFICATION (HEURISTIC)
    // ============================================
    for (const holder of topHolders) {
      const percent = Number(holder?.percent || 0);

      // 🧠 Smart Degens (balanced holders)
      if (percent > 1 && percent < 5) {
        smartDegenCount++;
      }

      // 🤖 Bot-like wallets (tiny fragmented)
      if (percent > 0 && percent < 0.2) {
        botDegenCount++;
      }

      // 🐀 Rat traders (mid-range but suspicious clustering)
      if (percent >= 5 && percent <= 10) {
        ratTraderCount++;
      }

      // 🎯 Snipers (very early large entries)
      if (percent >= 10) {
        sniperWalletCount++;
      }
    }

    // ============================================
    // ⚠️ SANITY ADJUSTMENTS
    // ============================================
    if (sniperWalletCount > 10) {
      warnings.push("High sniper wallet concentration");
    }

    if (botDegenCount > smartDegenCount) {
      warnings.push("Bot activity outweighs smart money");
    }

    if (ratTraderCount > 5) {
      warnings.push("High rat trader presence");
    }

    return {
      smartDegenCount,
      botDegenCount,
      ratTraderCount,
      sniperWalletCount,
      walletIntelligenceWarning:
        warnings.length > 0 ? warnings.join(" | ") : null,
    };
  } catch (err) {
    console.error("fetchWalletIntelligenceData error:", err);

    return {
      smartDegenCount: 0,
      botDegenCount: 0,
      ratTraderCount: 0,
      sniperWalletCount: 0,
      walletIntelligenceWarning: "Wallet intelligence failed",
    };
  }
}