// src/scanner/fetchAlphaActivityData.js

import { getAlphaCallers } from "./alphaCallers.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  const out = [];

  for (const item of arr) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function normalizeText(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function buildTokenNeedles({ tokenMint, token = {} }) {
  const needles = [];

  if (tokenMint) {
    needles.push(normalizeText(tokenMint));
  }

  if (token?.symbol) {
    const symbol = normalizeText(token.symbol).replace(/^\$/, "");
    if (symbol) {
      needles.push(symbol);
      needles.push(`$${symbol}`);
    }
  }

  if (token?.name) {
    const name = normalizeText(token.name);
    if (name) needles.push(name);
  }

  return [...new Set(needles.filter(Boolean))];
}

function textMentionsToken(text, needles) {
  const haystack = normalizeText(text);
  if (!haystack) return false;

  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Expected context shape for real data:
 *
 * context.recentPosts = [
 *   {
 *     source: "twitter" | "telegram",
 *     handle: "username",
 *     text: "post content",
 *     url: "https://...",
 *     timestamp: "2026-03-25T10:00:00.000Z"
 *   }
 * ]
 *
 * For now, if no recentPosts are supplied, engine returns zero mentions.
 */
export async function fetchAlphaActivityData({
  tokenMint,
  token = {},
  social = {},
  context = {},
} = {}) {
  const warnings = [];
  const callers = getAlphaCallers();
  const recentPosts = safeArray(context.recentPosts);
  const tokenNeedles = buildTokenNeedles({ tokenMint, token });

  if (!tokenMint) {
    warnings.push("Token mint missing for alpha/activity scan");
  }

  if (!callers.length) {
    warnings.push("No alpha callers configured yet");
  }

  if (!recentPosts.length) {
    warnings.push("No recent social posts available for alpha/activity scan");
  }

  const callerMap = new Map(
    callers.map((caller) => [
      `${caller.source}:${normalizeText(caller.handle)}`,
      caller,
    ])
  );

  const matchedMentions = [];

  for (const post of recentPosts) {
    const source = normalizeText(post?.source);
    const handle = normalizeText(post?.handle);
    const text = post?.text || "";

    if (!source || !handle) continue;

    const caller = callerMap.get(`${source}:${handle}`);
    if (!caller) continue;

    if (!textMentionsToken(text, tokenNeedles)) continue;

    matchedMentions.push({
      callerId: caller.id,
      callerName: caller.name,
      source: caller.source,
      handle: caller.handle,
      weight: Number(caller.weight || 1),
      text,
      url: post?.url || null,
      timestamp: post?.timestamp || null,
    });
  }

  const dedupedMentions = uniqueBy(
    matchedMentions,
    (m) => `${m.source}:${m.handle}:${m.url || m.text}`
  );

  const alphaCallerCount = new Set(
    dedupedMentions.map((m) => `${m.source}:${m.handle}`)
  ).size;

  const alphaCallerScore = dedupedMentions.reduce(
    (sum, mention) => sum + Number(mention.weight || 1),
    0
  );

  const xReplyCount = null;
  const telegramReplyCount = null;

  let xActivityScore = null;
  let telegramActivityScore = null;

  if (social?.hasTwitter) {
    xActivityScore = 10;
  }
  if (social?.hasTelegram) {
    telegramActivityScore = 10;
  }

  return {
    alphaCallerCount,
    alphaCallerMentions: dedupedMentions,
    alphaCallerScore,
    xReplyCount,
    telegramReplyCount,
    telegramActivityScore,
    xActivityScore,
    activityWarning:
      warnings.length > 0 ? warnings.join(" | ") : null,
  };
}