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
  // Examples:
  // {
  //   id: "caller-1",
  //   name: "Example X Caller",
  //   source: "twitter",
  //   handle: "examplecaller",
  //   weight: 3,
  // },
  // {
  //   id: "caller-2",
  //   name: "Example TG Caller",
  //   source: "telegram",
  //   handle: "examplechannel",
  //   weight: 2,
  // },
];

export function getAlphaCallers() {
  return ALPHA_CALLERS;
}