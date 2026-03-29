// src/scanner/fetchXPumpReplyData.js

/**
 * Free prototype for X pump-reply detection.
 *
 * IMPORTANT:
 * - This is NOT official X API access.
 * - It is a best-effort scraper/ingestor.
 * - For now, it works from context.recentXPosts if provided.
 * - Later, you can feed it from:
 *   - a mirror RSS source
 *   - a scraper job
 *   - a paid X API source
 */

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
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

function looksLikePumpReply(text) {
  const haystack = normalizeText(text);

  const pumpPatterns = [
    "send it",
    "moon",
    "lfg",
    "ape",
    "ape in",
    "gem",
    "bullish",
    "sendor",
    "runner",
    "next leg",
    "parabolic",
    "fire",
    "strong",
    "looks good",
    "looks clean",
    "good entry",
    "buying",
    "loaded",
    "this is it",
    "next 10x",
    "10x",
    "100x",
  ];

  return pumpPatterns.some((pattern) => haystack.includes(pattern));
}

/**
 * Expected input:
 * context.recentXPosts = [
 *   {
 *     handle: "projectxaccount",
 *     text: "reply or post text",
 *     url: "https://x.com/....",
 *     timestamp: "...",
 *     isReply: true
 *   }
 * ]
 *
 * For free mode, you can manually feed scraped/mirrored items here.
 */
export async function fetchXPumpReplyData({
  tokenMint,
  token = {},
  social = {},
  context = {},
} = {}) {
  const warnings = [];
  const recentXPosts = safeArray(context.recentXPosts);
  const tokenNeedles = buildTokenNeedles({ tokenMint, token });

  if (!social?.hasTwitter) {
    warnings.push("No X account found for this token");
  }

  if (!recentXPosts.length) {
    warnings.push("No recent X posts available for pump reply scan");
  }

  const matched = recentXPosts
    .map((post) => {
      const text = post?.text || "";
      const mentionsToken = textMentionsToken(text, tokenNeedles);
      const pumpLike = looksLikePumpReply(text);

      return {
        handle: post?.handle || null,
        text,
        url: post?.url || null,
        timestamp: post?.timestamp || null,
        isReply: Boolean(post?.isReply),
        mentionsToken,
        pumpLike,
      };
    })
    .filter((post) => post.mentionsToken && post.pumpLike);

  const deduped = uniqueBy(
    matched,
    (item) => `${item.url || ""}|${item.text}|${item.handle || ""}`
  );

  const xReplyCount = deduped.length;

  let xPumpReplyScore = null;
  if (xReplyCount > 0) {
    if (xReplyCount >= 10) xPumpReplyScore = 30;
    else if (xReplyCount >= 5) xPumpReplyScore = 20;
    else if (xReplyCount >= 2) xPumpReplyScore = 10;
    else xPumpReplyScore = 5;
  }

  return {
    xReplyCount: xReplyCount > 0 ? xReplyCount : null,
    xPumpReplyScore,
    xPumpReplyMentions: deduped,
    xPumpReplyWarning:
      warnings.length > 0
        ? warnings.join(" | ")
        : "Free X pump reply prototype active",
  };
}