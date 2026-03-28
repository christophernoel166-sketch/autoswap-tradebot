// src/scanner/checkWebsiteStatus.js

function normalizeUrl(value) {
  if (!value || typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw}`;
  }

  return raw;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(normalizeUrl(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function checkWebsiteStatus(websiteUrl) {
  const url = normalizeUrl(websiteUrl);

  if (!url || !isValidHttpUrl(url)) {
    return {
      websiteWorking: false,
      websiteStatusCode: null,
      websiteFinalUrl: null,
      websiteWarning: "Invalid website URL",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "autoswap-tradebot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeout);

    return {
      websiteWorking: res.ok,
      websiteStatusCode: res.status,
      websiteFinalUrl: res.url || url,
      websiteWarning: res.ok
        ? null
        : `Website returned status ${res.status}`,
    };
  } catch (err) {
    return {
      websiteWorking: false,
      websiteStatusCode: null,
      websiteFinalUrl: url,
      websiteWarning:
        err?.name === "AbortError"
          ? "Website check timed out"
          : "Website could not be reached",
    };
  }
}