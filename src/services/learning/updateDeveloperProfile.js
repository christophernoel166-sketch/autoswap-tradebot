import DeveloperProfile
from "../../../models/DeveloperProfile.js";

function safeAverage(currentAverage, currentCount, newValue) {

  if (!Number.isFinite(newValue)) {
    return currentAverage ?? 0;
  }

  if (currentCount <= 0) {
    return newValue;
  }

  return (
    (currentAverage * currentCount + newValue) /
    (currentCount + 1)
  );

}

export async function updateDeveloperProfile(outcome) {

  try {

    const developerWallet =
      outcome.developerWallet;

    if (!developerWallet) {
      return;
    }

    let profile =
      await DeveloperProfile.findOne({
        developerWallet,
      });

    if (!profile) {

      profile =
        new DeveloperProfile({

          developerWallet,

          firstLaunch:
            outcome.scannedAt,

        });

    }

    // =====================================================
    // Activity
    // =====================================================

    const previousTokens =
      profile.tokensCreated;

    profile.tokensCreated += 1;

    profile.lastLaunch =
      outcome.scannedAt;

    profile.lastUpdated =
      new Date();

    // =====================================================
    // Outcome Counters
    // =====================================================

    switch (outcome.label) {

      case "MOONSHOT":

        profile.moonshots += 1;
        profile.successfulTokens += 1;

        break;

      case "WINNER":

        profile.successfulTokens += 1;

        break;

      case "NEUTRAL":

        profile.neutralTokens += 1;

        break;

      case "LOSER":

        profile.failedTokens += 1;

        break;

      case "RUG_OR_FAILURE":

        profile.failedTokens += 1;
        profile.rugs += 1;

        break;

    }

    // =====================================================
    // ROI
    // =====================================================

    profile.averageROI = safeAverage(

      profile.averageROI,

      previousTokens,

      outcome.return24h

    );

    profile.averagePeakReturn = safeAverage(

      profile.averagePeakReturn,

      previousTokens,

      outcome.peakReturn

    );

    // =====================================================
    // Best / Worst
    // =====================================================

    if (
      Number.isFinite(outcome.peakReturn)
    ) {

      profile.bestReturn = Math.max(

        profile.bestReturn,

        outcome.peakReturn

      );

      if (
        profile.worstReturn === 0
      ) {

        profile.worstReturn =
          outcome.return24h ?? 0;

      } else {

        profile.worstReturn = Math.min(

          profile.worstReturn,

          outcome.return24h ?? 0

        );

      }

      profile.largestMoonshot = Math.max(

        profile.largestMoonshot,

        outcome.peakReturn

      );

    }

    // =====================================================
    // AI Memory
    // =====================================================

    profile.averageForecast = safeAverage(

      profile.averageForecast,

      previousTokens,

      outcome.forecastScore

    );

    profile.averageAIScore = safeAverage(

      profile.averageAIScore,

      previousTokens,

      outcome.recommendationConfidence

    );

    profile.averageConsensus = safeAverage(

      profile.averageConsensus,

      previousTokens,

      outcome.consensus

    );

    profile.averageTrustScore = safeAverage(

      profile.averageTrustScore,

      previousTokens,

      outcome.trustScore

    );

    profile.averageAgreement = safeAverage(

      profile.averageAgreement,

      previousTokens,

      outcome.agreement

    );

    profile.averageConfidence = safeAverage(

      profile.averageConfidence,

      previousTokens,

      outcome.overallConfidence

    );

    // =====================================================
    // Success Rates
    // =====================================================

    profile.winRate = Math.round(

      (
        profile.successfulTokens /
        profile.tokensCreated
      ) * 100

    );

    profile.rugRate = Math.round(

      (
        profile.rugs /
        profile.tokensCreated
      ) * 100

    );

    // =====================================================
    // Reputation
    // =====================================================

    const reputation =

      profile.winRate * 0.40 +

      profile.averagePeakReturn * 0.20 +

      profile.averageConsensus * 0.15 +

      profile.averageTrustScore * 0.15 +

      profile.averageAIScore * 0.10;

    profile.reputation = Math.max(

      0,

      Math.min(

        Math.round(reputation),

        100

      )

    );

    // =====================================================
    // Developer Confidence
    // =====================================================

    profile.developerConfidence = Math.min(

      100,

      Math.round(

        profile.tokensCreated * 5

      )

    );

    // =====================================================
    // Recent Launches
    // =====================================================

    profile.recentLaunches.unshift({

      mint:
        outcome.mintAddress,

      symbol:
        outcome.symbol,

      launchedAt:
        outcome.scannedAt,

      roi:
        outcome.return24h,

      peakReturn:
        outcome.peakReturn,

      ath:
        outcome.peakReturn,

      lifetimeHours: 3,

      result:
        outcome.label,

      forecast:
        outcome.forecastScore,

      aiScore:
        outcome.recommendationConfidence,

      consensus:
        outcome.consensus,

      trustScore:
        outcome.trustScore,

      agreement:
        outcome.agreement,

      confidence:
        outcome.overallConfidence,

    });

    // Keep only latest 25 launches

    profile.recentLaunches =
      profile.recentLaunches.slice(
        0,
        25
      );

    await profile.save();

    console.log(
      `🧠 Updated developer profile ${developerWallet}`
    );

  } catch (err) {

    console.error(

      "updateDeveloperProfile:",

      err?.message || err

    );

  }

}