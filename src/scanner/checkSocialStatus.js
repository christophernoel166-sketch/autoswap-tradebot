// src/scanner/checkSocialStatus.js

function normalizeUrl(value) {
  if (!value || typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

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

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "autoswap-tradebot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkSocialStatus(socialData = {}) {
  const result = {
    ...socialData,

    twitterWorking: null,
    twitterStatusCode: null,
    twitterFinalUrl: socialData.twitterUrl || null,

    telegramWorking: null,
    telegramStatusCode: null,
    telegramFinalUrl: socialData.telegramUrl || null,

    alphaCallerCount: null,
    xReplyCount: null,
    telegramReplyCount: null,

    socialWarnings: [],
  };

  // X / Twitter check
  if (socialData.twitterUrl && isTwitterUrl(socialData.twitterUrl)) {
    try {
      const res = await fetchWithTimeout(normalizeUrl(socialData.twitterUrl), 8000);
      result.twitterWorking = res.ok;
      result.twitterStatusCode = res.status;
      result.twitterFinalUrl = res.url || normalizeUrl(socialData.twitterUrl);

      if (!res.ok) {
        result.socialWarnings.push(`X account returned status ${res.status}`);
      }
    } catch (err) {
      result.twitterWorking = false;
      result.socialWarnings.push(
        err?.name === "AbortError"
          ? "X account check timed out"
          : "X account could not be reached"
      );
    }
  }

  // Telegram check
  if (socialData.telegramUrl && isTelegramUrl(socialData.telegramUrl)) {
    try {
      const res = await fetchWithTimeout(normalizeUrl(socialData.telegramUrl), 8000);
      result.telegramWorking = res.ok;
      result.telegramStatusCode = res.status;
      result.telegramFinalUrl = res.url || normalizeUrl(socialData.telegramUrl);

      if (!res.ok) {
        result.socialWarnings.push(`Telegram link returned status ${res.status}`);
      }
    } catch (err) {
      result.telegramWorking = false;
      result.socialWarnings.push(
        err?.name === "AbortError"
          ? "Telegram link check timed out"
          : "Telegram link could not be reached"
      );
    }
  }

  return result;
}