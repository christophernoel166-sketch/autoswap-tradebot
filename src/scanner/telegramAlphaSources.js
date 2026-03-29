// src/scanner/telegramAlphaSources.js

export const TELEGRAM_ALPHA_SOURCES = [
  {
    id: "tg-4am-volume",
    name: "4AM Solana Volume Signal",
    handle: "signalsolanaby4am",
    weight: 3,
  },
  {
    id: "tg-solhouse-signal",
    name: "SolHouse Signal",
    handle: "solhousesignal",
    weight: 2,
  },
];

export function getTelegramAlphaSources() {
  return TELEGRAM_ALPHA_SOURCES;
}