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
    id: "tg-4am-volume",
    name: "4AM Solana Volume Signal",
    source: "telegram",
    handle: "signalsolanaby4am",
    weight: 3,
  },
  {
    id: "tg-solhouse-signal",
    name: "SolHouse Signal",
    source: "telegram",
    handle: "solhousesignal",
    weight: 2,
  },
  {
    id: "kingdom-of-degen-calls",
    name: "Kingdom of Degen CALLS",
    source: "telegram",
    handle: "KingdomOfDegenCalls",
    weight: 3,
  },
];

export function getAlphaCallers() {
  return ALPHA_CALLERS;
}