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
];

export function getAlphaCallers() {
  return ALPHA_CALLERS;
}