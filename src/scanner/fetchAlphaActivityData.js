// src/scanner/fetchAlphaActivityData.js

/**
 * Phase 1:
 * This file standardizes alpha/activity output so the rest of the scanner
 * can use it immediately.
 *
 * Right now it returns safe defaults.
 * Later we will plug in:
 * - tracked X accounts
 * - tracked Telegram channels/groups
 * - reply/activity scraping or APIs
 */

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(arr) {
  return [...new Set(safeArray(arr).filter(Boolean))];
}

export async function fetchAlphaActivityData({
  tokenMint,
  token = {},
  social = {},
  context = {},
} = {}) {
  const warnings = [];

  if (!tokenMint) {
    warnings.push("Token mint missing for alpha/activity scan");
  }

  // Phase 1 defaults
  const alphaCallerMentions = [];
  const telegramMentions = [];
  const xMentions = [];

  const alphaCallerCount = alphaCallerMentions.length;
  const xReplyCount = null; // not implemented yet
  const telegramReplyCount = null; // not implemented yet

  // We use a lightweight score placeholder:
  // later this becomes a real score from real messages/posts.
  let telegramActivityScore = null;
  let xActivityScore = null;

  // Small hinting logic so UI isn't blank forever
  // This is presence-based only, not real activity yet.
  if (social?.hasTelegram) {
    telegramActivityScore = 10;
  }
  if (social?.hasTwitter) {
    xActivityScore = 10;
  }

  return {
    alphaCallerCount,
    alphaCallerMentions,
    xReplyCount,
    telegramReplyCount,
    telegramActivityScore,
    xActivityScore,
    activityWarning:
      warnings.length > 0
        ? uniqueStrings(warnings).join(" | ")
        : "Alpha/activity detection not fully connected yet",
  };
}