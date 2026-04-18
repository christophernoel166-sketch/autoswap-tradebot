import express from "express";
import User from "../models/User.js";

const router = express.Router();

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * POST /api/users/update-settings
 */
router.post("/update-settings", async (req, res) => {
  try {
    const {
      walletAddress,
      solPerTrade,
      tp1,
      tp1SellPercent,
      tp2,
      tp2SellPercent,
      tp3,
      tp3SellPercent,
      stopLoss,
      trailingTrigger,
      trailingDistance,
      maxSlippagePercent,
      mevProtection,

      // ✅ NEW
      customConditionMode,
      tokenConditions,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const updates = {};

    // ===================================================
    // EXISTING TRADING SETTINGS
    // ===================================================
    if (solPerTrade !== undefined) updates.solPerTrade = Number(solPerTrade);
    if (tp1 !== undefined) updates.tp1 = Number(tp1);
    if (tp1SellPercent !== undefined) updates.tp1SellPercent = Number(tp1SellPercent);
    if (tp2 !== undefined) updates.tp2 = Number(tp2);
    if (tp2SellPercent !== undefined) updates.tp2SellPercent = Number(tp2SellPercent);
    if (tp3 !== undefined) updates.tp3 = Number(tp3);
    if (tp3SellPercent !== undefined) updates.tp3SellPercent = Number(tp3SellPercent);
    if (stopLoss !== undefined) updates.stopLoss = Number(stopLoss);
    if (trailingTrigger !== undefined) updates.trailingTrigger = Number(trailingTrigger);
    if (trailingDistance !== undefined) updates.trailingDistance = Number(trailingDistance);
    if (maxSlippagePercent !== undefined) updates.maxSlippagePercent = Number(maxSlippagePercent);

    // Optional: only save if field exists in schema
    if (mevProtection !== undefined) updates.mevProtection = Boolean(mevProtection);

    // ===================================================
    // NEW CUSTOM CONDITION MODE
    // ===================================================
    if (typeof customConditionMode === "boolean") {
      updates.customConditionMode = customConditionMode;
    }

    // ===================================================
    // NEW TOKEN CONDITIONS
    // ===================================================
    if (tokenConditions && typeof tokenConditions === "object") {
      updates.tokenConditions = {
        market: {
          minLiquidityUsd: toNumberOrNull(tokenConditions?.market?.minLiquidityUsd),
          minMarketCapUsd: toNumberOrNull(tokenConditions?.market?.minMarketCapUsd),
          maxMarketCapUsd: toNumberOrNull(tokenConditions?.market?.maxMarketCapUsd),
          minBuys5m: toNumberOrNull(tokenConditions?.market?.minBuys5m),
          maxSells5m: toNumberOrNull(tokenConditions?.market?.maxSells5m),
          minAgeMinutes: toNumberOrNull(tokenConditions?.market?.minAgeMinutes),
          maxAgeMinutes: toNumberOrNull(tokenConditions?.market?.maxAgeMinutes),
        },

        holderSafety: {
          maxLargestHolderPercent: toNumberOrNull(tokenConditions?.holderSafety?.maxLargestHolderPercent),
          maxTop10HoldingPercent: toNumberOrNull(tokenConditions?.holderSafety?.maxTop10HoldingPercent),
        },

        socials: {
          requireWebsite: Boolean(tokenConditions?.socials?.requireWebsite),
          requireTelegram: Boolean(tokenConditions?.socials?.requireTelegram),
          requireTwitter: Boolean(tokenConditions?.socials?.requireTwitter),
        },

        marketIntegrity: {
          minBuySellRatio5m: toNumberOrNull(tokenConditions?.marketIntegrity?.minBuySellRatio5m),
          minWalletParticipationScore: toNumberOrNull(tokenConditions?.marketIntegrity?.minWalletParticipationScore),
          minVelocitySanityScore: toNumberOrNull(tokenConditions?.marketIntegrity?.minVelocitySanityScore),
          maxBundleSuspicionScore: toNumberOrNull(tokenConditions?.marketIntegrity?.maxBundleSuspicionScore),
          allowFakeMomentum:
            tokenConditions?.marketIntegrity?.allowFakeMomentum !== undefined
              ? Boolean(tokenConditions.marketIntegrity.allowFakeMomentum)
              : true,
          allowArtificialVolume:
            tokenConditions?.marketIntegrity?.allowArtificialVolume !== undefined
              ? Boolean(tokenConditions.marketIntegrity.allowArtificialVolume)
              : true,
        },

        walletIntelligence: {
          minSmartDegenCount: toNumberOrNull(tokenConditions?.walletIntelligence?.minSmartDegenCount),
          maxBotDegenCount: toNumberOrNull(tokenConditions?.walletIntelligence?.maxBotDegenCount),
          maxRatTraderCount: toNumberOrNull(tokenConditions?.walletIntelligence?.maxRatTraderCount),
          minAlphaCallerCount: toNumberOrNull(tokenConditions?.walletIntelligence?.minAlphaCallerCount),
          maxSniperWalletCount: toNumberOrNull(tokenConditions?.walletIntelligence?.maxSniperWalletCount),
        },

        riskStructure: {
          maxBundledWalletCount: toNumberOrNull(tokenConditions?.riskStructure?.maxBundledWalletCount),
          maxFundingClusterScore: toNumberOrNull(tokenConditions?.riskStructure?.maxFundingClusterScore),
          maxLargestFundingCluster: toNumberOrNull(tokenConditions?.riskStructure?.maxLargestFundingCluster),
        },

        rugRisk: {
          maxRugRiskScore: toNumberOrNull(tokenConditions?.rugRisk?.maxRugRiskScore),
        },
      };
    }

    Object.assign(user, updates);
    await user.save();

    return res.json({ ok: true, user });
  } catch (err) {
    console.error("update-settings error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;