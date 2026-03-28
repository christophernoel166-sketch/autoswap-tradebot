// src/scanner/telegramAlphaSources.js

/**
 * Trusted Telegram alpha sources.
 *
 * handle:
 * - Telegram public username without @
 *
 * weight:
 * - Higher weight = stronger contribution to alphaCallerScore
 */

export const TELEGRAM_ALPHA_SOURCES = [
  // Example:
  // {
  //   id: "tg-alpha-1",
  //   name: "Example Alpha Channel",
  //   handle: "examplechannel",
  //   weight: 3,
  // },

  // Add your real channels here
];

export function getTelegramAlphaSources() {
  return TELEGRAM_ALPHA_SOURCES;
}