import { evaluateTokenSafety } from "./src/scanner/tokenSafetyEngine.js";

const result = evaluateTokenSafety({
  ageMinutes: 49,
  liquidityUsd: 24078.87,
  marketCapUsd: 92727,
  volume5mUsd: 9551.77,
  buys5m: 261,
  sells5m: 218,
  holderCount: 1245,
  largestHolderPercent: 12.42,
  top10HoldingPercent: 18.54,
  smartDegenCount: 0,
  botDegenCount: 0,
  ratTraderCount: 0,
  alphaCallerCount: 0,
  sniperWalletCount: 10,
  bundleScore: 6,
  bundledWalletCount: 2,
  fundingClusterScore: 0,
  largestFundingCluster: 0,
  momentumScore: 75,
  velocityBreakoutScore: 100,
  boosted: true,
});

console.log(JSON.stringify(result, null, 2));