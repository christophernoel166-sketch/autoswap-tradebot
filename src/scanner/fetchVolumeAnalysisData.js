export async function fetchVolumeAnalysisData({
  volume5mUsd,
  buys5m,
  sells5m,
}) {
  const volume = Number(volume5mUsd || 0);
  const buys = Number(buys5m || 0);
  const sells = Number(sells5m || 0);

  const buySellRatio =
    sells > 0 ? buys / sells : buys;

  let volumeScore = 0;
  let volumeVerdict = "Weak";

  if (buySellRatio >= 3) {
    volumeScore = 100;
    volumeVerdict = "Explosive";
  } else if (buySellRatio >= 2) {
    volumeScore = 85;
    volumeVerdict = "Strong";
  } else if (buySellRatio >= 1.5) {
    volumeScore = 70;
    volumeVerdict = "Bullish";
  } else if (buySellRatio >= 1) {
    volumeScore = 50;
    volumeVerdict = "Neutral";
  } else {
    volumeScore = 20;
    volumeVerdict = "Bearish";
  }

  return {
    volumeUsd: volume,
    buys5m: buys,
    sells5m: sells,
    buySellRatio: Number(
      buySellRatio.toFixed(2)
    ),
    volumeScore,
    volumeVerdict,
  };
}