// src/scanner/alphaCallers.js

/**
 * Add the alpha callers you trust here.
 *
 * source:
 * - "twitter"
 * - "telegram"
 *
 * handle:
 * - X username without @
 * - Telegram channel/group username without @
 */

export const ALPHA_CALLERS = [
  {
    id: "tg-alpha-1",
    name: "High Conviction Calls",
    source: "telegram",
    handle: "highconvictioncalls", // replace with real channel
    weight: 3,
  },
  {
    id: "tg-alpha-2",
    name: "Solana Gems",
    source: "telegram",
    handle: "solanagems", // replace with real channel
    weight: 2,
  },
  {
    id: "x-alpha-1",
    name: "Crypto Whale X",
    source: "twitter",
    handle: "cryptowhale", // replace with real X account
    weight: 2,
  },
];

{
  id: "tg-4am-volume",
  name: "4AM Solana Volume Signal",
  source: "telegram",
  handle: "signalsolanaby4am",
  weight: 3,
},
export function getAlphaCallers() {
  return ALPHA_CALLERS;
}