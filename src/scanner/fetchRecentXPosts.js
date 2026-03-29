// src/scanner/fetchRecentXPosts.js

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeHandle(handle) {
  return safeString(handle).replace(/^@/, "").trim().toLowerCase();
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml = "") {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = stripHtml(titleMatch?.[1] || "");
    const description = stripHtml(descMatch?.[1] || "");
    const link = safeString(linkMatch?.[1] || "");
    const pubDate = safeString(pubDateMatch?.[1] || "");

    items.push({
      text: [title, description].filter(Boolean).join(" ").trim(),
      url: link || null,
      timestamp: pubDate || null,
    });
  }

  return items;
}

/**
 * No-API X ingestion via configurable RSS/mirror endpoint.
 *
 * ENV:
 * X_RSS_BASE_URL=https://your-rss-or-mirror-domain
 *
 * Example feed path shape expected:
 *   ${X_RSS_BASE_URL}/${handle}/rss
 */
export async function fetchRecentXPosts({
  handles = [],
  limitPerHandle = 5,
} = {}) {
  const baseUrl = safeString(process.env.X_RSS_BASE_URL);
  const normalizedHandles = [...new Set(handles.map(normalizeHandle).filter(Boolean))];

  if (!baseUrl) {
    return {
      posts: [],
      warning: "X RSS base URL not configured",
    };
  }

  if (!normalizedHandles.length) {
    return {
      posts: [],
      warning: "No X handles configured for ingestion",
    };
  }

  const allPosts = [];
  const warnings = [];

  for (const handle of normalizedHandles) {
    const rssUrl = `${baseUrl.replace(/\/+$/, "")}/${handle}/rss`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(rssUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "User-Agent": "autoswap-tradebot/1.0",
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        warnings.push(`X feed for @${handle} returned ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const items = parseRssItems(xml).slice(0, limitPerHandle);

      for (const item of items) {
        allPosts.push({
          source: "twitter",
          handle,
          text: item.text,
          url: item.url,
          timestamp: item.timestamp,
          isReply: true, // best-effort assumption for prototype
        });
      }
    } catch (err) {
      warnings.push(
        err?.name === "AbortError"
          ? `X feed for @${handle} timed out`
          : `X feed for @${handle} could not be fetched`
      );
    }
  }

  return {
    posts: allPosts,
    warning: warnings.length ? warnings.join(" | ") : null,
  };
}