import DeveloperProfile from "../models/DeveloperProfile.js";

export async function updateDeveloperProfile({

  developerWallet,

  mint,

  symbol,

  roi,

  ath,

  lifetimeHours,

  result,

}) {

  if (!developerWallet) return;

  let profile = await DeveloperProfile.findOne({

    wallet: developerWallet,

  });

  if (!profile) {

    profile = new DeveloperProfile({

      wallet: developerWallet,

    });

  }

  profile.tokensCreated += 1;

  profile.lastLaunch = new Date();

  profile.recentLaunches.unshift({

    mint,

    symbol,

    launchedAt: new Date(),

    roi,

    ath,

    result,

  });

  profile.recentLaunches =
    profile.recentLaunches.slice(0, 25);

  switch (result) {

    case "MOONSHOT":

      profile.moonshots += 1;

      profile.successfulTokens += 1;

      break;

    case "WINNER":

      profile.successfulTokens += 1;

      break;

    case "RUG_OR_FAILURE":

      profile.rugs += 1;

      profile.failedTokens += 1;

      break;

    default:

      profile.failedTokens += 1;

  }

  const total =
    profile.tokensCreated;

  profile.winRate =
    total === 0
      ? 0
      : Math.round(
          (profile.successfulTokens / total) *
          100
        );

  profile.rugRate =
    total === 0
      ? 0
      : Math.round(
          (profile.rugs / total) *
          100
        );

  profile.averageROI =
    Math.round(
      (
        profile.averageROI *
          (total - 1) +
        roi
      ) / total
    );

  profile.averageATH =
    Math.round(
      (
        profile.averageATH *
          (total - 1) +
        ath
      ) / total
    );

  profile.averageLifetimeHours =
    Math.round(
      (
        profile.averageLifetimeHours *
          (total - 1) +
        lifetimeHours
      ) / total
    );

  // -----------------------
  // Developer Trust Score
  // -----------------------

  let trust = 50;

  trust += profile.winRate * 0.35;

  trust += profile.averageROI * 0.05;

  trust += profile.averageATH * 0.8;

  trust -= profile.rugRate * 0.6;

  if (profile.tokensCreated < 5) {

    trust *= 0.75;

  }

  trust = Math.max(
    0,
    Math.min(
      Math.round(trust),
      100
    )
  );

  profile.trustScore = trust;

  await profile.save();

  return profile;

}