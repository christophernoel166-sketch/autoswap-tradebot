// src/scanner/fetchTokenSocialData.js

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeUrl(value) {
  const raw = safeString(value);
  if (!raw) return "";

  // Add protocol if missing
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw}`;
  }

  return raw;
}

function isTelegramUrl(url) {
  return /^(https?:\/\/)?(t\.me|telegram\.me)\//i.test(url || "");
}

function isTwitterUrl(url) {
  return /^(https?:\/\/)?(x\.com|twitter\.com)\//i.test(url || "");
}

function isWebsiteUrl(url) {
  if (!url) return false;
  if (isTelegramUrl(url)) return false;
  if (isTwitterUrl(url)) return false;

  try {
    const u = new URL(normalizeUrl(url));
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function extractSocialsFromLinks(links = []) {
  let websiteUrl = "";
  let telegramUrl = "";
  let twitterUrl = "";

  for (const link of links) {
    const normalized = normalizeUrl(link);
    if (!normalized) continue;

    if (!telegramUrl && isTelegramUrl(normalized)) {
      telegramUrl = normalized;
      continue;
    }

    if (!twitterUrl && isTwitterUrl(normalized)) {
      twitterUrl = normalized;
      continue;
    }

    if (!websiteUrl && isWebsiteUrl(normalized)) {
      websiteUrl = normalized;
    }
  }

  return {
    websiteUrl,
    telegramUrl,
    twitterUrl,
  };
}

function collectCandidateLinksFromPair(pair = {}) {
  const candidates = [];

  // DexScreener style info block
  if (Array.isArray(pair?.info?.websites)) {
    for (const item of pair.info.websites) {
      if (typeof item === "string") {
        candidates.push(item);
      } else if (item?.url) {
        candidates.push(item.url);
      }
    }
  }

  if (Array.isArray(pair?.info?.socials)) {
    for (const item of pair.info.socials) {
      if (typeof item === "string") {
        candidates.push(item);
      } else if (item?.url) {
        candidates.push(item.url);
      }
    }
  }

  // Fallback fields if provider shape changes
  if (pair?.website) candidates.push(pair.website);
  if (pair?.telegram) candidates.push(pair.telegram);
  if (pair?.twitter) candidates.push(pair.twitter);
  if (pair?.x) candidates.push(pair.x);

  return candidates.filter(Boolean);
}

/**
 * Phase 1 only:
 * Detect whether the token has a website / Telegram / X account present.
 *
 * Input can be:
 * - raw DexScreener pair object
 * - token object with social/link fields
 *
 * This function does NOT yet verify that the website is working.
 */
export function fetchTokenSocialData(input = {}) {
  const candidateLinks = collectCandidateLinksFromPair(input);

  const {
    websiteUrl,
    telegramUrl,
    twitterUrl,
  } = extractSocialsFromLinks(candidateLinks);

  return {
    websiteUrl: websiteUrl || null,
    telegramUrl: telegramUrl || null,
    twitterUrl: twitterUrl || null,

    hasWebsite: Boolean(websiteUrl),
    hasTelegram: Boolean(telegramUrl),
    hasTwitter: Boolean(twitterUrl),

    // Phase 2 placeholders
    websiteWorking: null,

    // Phase 3 placeholders
    alphaCallerCount: null,
    xReplyCount: null,
    telegramReplyCount: null,

    socialWarning:
      !websiteUrl && !telegramUrl && !twitterUrl
        ? "No website, Telegram, or X link found"
        : null,
  };
}