// src/scanner/fetchTelegramAlphaPosts.js

import { getTelegramAlphaSources } from "./telegramAlphaSources.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Phase 1 ingestion strategy:
 *
 * This function reads recent Telegram messages from a source you already control.
 *
 * Supported input:
 * options.recentTelegramMessages = [
 *   {
 *     handle: "channelusername",
 *     text: "message body",
 *     url: "https://t.me/channelusername/123",
 *     timestamp: "2026-03-25T10:00:00.000Z"
 *   }
 * ]
 *
 * Output format is normalized for fetchAlphaActivityData():
 * [
 *   {
 *     source: "telegram",
 *     handle: "channelusername",
 *     text: "...",
 *     url: "...",
 *     timestamp: "..."
 *   }
 * ]
 *
 * Later, you can replace the input feed with:
 * - DB reads
 * - bot-collected channel messages
 * - webhook/event pipeline
 */
export async function fetchTelegramAlphaPosts(options = {}) {
  const trustedSources = getTelegramAlphaSources();
  const trustedHandles = new Set(
    trustedSources.map((src) => normalizeText(src.handle).toLowerCase()).filter(Boolean)
  );

  const recentTelegramMessages = safeArray(options.recentTelegramMessages);

  const normalizedPosts = recentTelegramMessages
    .map((msg) => {
      const handle = normalizeText(msg?.handle).replace(/^@/, "").toLowerCase();
      const text = normalizeText(msg?.text);
      const url = normalizeText(msg?.url);
      const timestamp = msg?.timestamp || null;

      return {
        source: "telegram",
        handle,
        text,
        url: url || null,
        timestamp,
      };
    })
    .filter((post) => post.handle && post.text);

  if (!trustedHandles.size) {
    return {
      posts: [],
      warning: "No Telegram alpha sources configured yet",
    };
  }

  const filteredPosts = normalizedPosts.filter((post) =>
    trustedHandles.has(post.handle)
  );

  return {
    posts: filteredPosts,
    warning:
      filteredPosts.length > 0
        ? null
        : "No recent Telegram alpha posts available",
  };
}