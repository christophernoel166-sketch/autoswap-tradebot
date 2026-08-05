import DeveloperProfile from "../../models/DeveloperProfile.js";

// =====================================================
// Fetch Developer Intelligence
// =====================================================

export async function fetchDeveloperProfile(developerWallet) {

  if (!developerWallet) {

    return null;

  }

  const profile =
    await DeveloperProfile.findOne({

      wallet: developerWallet,

    }).lean();

  if (!profile) {

    return {

      developerWallet,

      trustScore: 0,

      verdict: "UNKNOWN",

      previousLaunches: 0,

      successfulLaunches: 0,

      moonshots: 0,

      ruggedLaunches: 0,

      failedLaunches: 0,

      winRate: 0,

      rugRate: 0,

      averageROI: 0,

      averageATH: 0,

      averageLifetimeHours: 0,

      lastLaunch: null,

    };

  }

  // =====================================================
  // Developer Verdict
  // =====================================================

  let verdict = "HIGH_RISK";

  if (profile.trustScore >= 90) {

    verdict = "ELITE";

  }

  else if (profile.trustScore >= 75) {

    verdict = "TRUSTED";

  }

  else if (profile.trustScore >= 60) {

    verdict = "GOOD";

  }

  else if (profile.trustScore >= 40) {

    verdict = "CAUTION";

  }

  return {

    developerWallet,

    trustScore:
      profile.trustScore ?? 0,

    verdict,

    previousLaunches:
      profile.tokensCreated ?? 0,

    successfulLaunches:
      profile.successfulTokens ?? 0,

    moonshots:
      profile.moonshots ?? 0,

    ruggedLaunches:
      profile.rugs ?? 0,

    failedLaunches:
      profile.failedTokens ?? 0,

    winRate:
      profile.winRate ?? 0,

    rugRate:
      profile.rugRate ?? 0,

    averageROI:
      profile.averageROI ?? 0,

    averageATH:
      profile.averageATH ?? 0,

    averageLifetimeHours:
      profile.averageLifetimeHours ?? 0,

    lastLaunch:
      profile.lastLaunch ?? null,

    recentLaunches:
      profile.recentLaunches ?? [],

  };

}