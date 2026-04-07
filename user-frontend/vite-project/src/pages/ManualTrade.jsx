import React from "react";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

function formatUsd(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ✅ NEW: shorten address helper
function shortAddress(address) {
  if (!address || typeof address !== "string") return "—";
  return address.length > 12
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : address;
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right break-all">
        {value}
      </span>
    </div>
  );
}

function LinkRow({ label, url, exists }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 gap-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-sm font-medium text-right">
        {exists && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            Open
          </a>
        ) : (
          <span className="text-gray-900 dark:text-gray-100">Missing</span>
        )}
      </div>
    </div>
  );
}

export default function ManualTrade({
  manualTokenMint,
  setManualTokenMint,
  scanManualToken,
  scanLoading,
  scanResult,
  scanError,
  walletAddress,
}) {
  const evaluation = scanResult?.evaluation || null;
  const metrics = scanResult?.metrics || null;
  const token = scanResult?.token || null;
  const social = scanResult?.social || null;
  const integrity = scanResult?.integrity || null;
  const rugRisk = scanResult?.rugRisk || null;

  // ✅ NEW: safely resolve top holders
  const topHolders =
    scanResult?.holderSafety?.topHolders ||
    scanResult?.topHolders ||
    metrics?.topHolders ||
    [];

  const verdict = evaluation?.verdict || null;
  const showBuy = Boolean(evaluation?.showBuy);
  const buyConfidence = evaluation?.buyConfidence || "NONE";

  const verdictColor =
    verdict === "SAFE"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : verdict === "CAUTION"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : verdict === "UNSAFE"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

  const buyButtonClass = showBuy
    ? buyConfidence === "MEDIUM"
      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
      : "bg-green-600 hover:bg-green-700 text-white"
    : "bg-gray-400 text-white cursor-not-allowed";

  async function handleManualBuy() {
    try {
      if (!walletAddress || !scanResult?.token?.mintAddress) {
        alert("Wallet or token is missing");
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE || "";

      const res = await fetch(`${API_BASE}/api/tokens/manual-buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          tokenMint: scanResult.token.mintAddress,
          source: "manual_dashboard",
          scanResult: {
            evaluation: scanResult.evaluation,
            expiresAt: scanResult.expiresAt,
            scannedAt: scanResult.scannedAt,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to queue manual buy");
      }

      alert("Manual buy queued successfully");
    } catch (err) {
      alert(err.message || "Manual buy failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* ... unchanged sections above ... */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Market">
          <MetricRow label="Age" value={formatValue(metrics?.ageMinutes, " minutes")} />
          <MetricRow label="Liquidity" value={formatUsd(metrics?.liquidityUsd)} />
          <MetricRow label="Market Cap" value={formatUsd(metrics?.marketCapUsd)} />
          <MetricRow label="Volume (5m)" value={formatUsd(metrics?.volume5mUsd)} />
          <MetricRow
            label="Buys / Sells"
            value={`${formatValue(metrics?.buys5m)} / ${formatValue(metrics?.sells5m)}`}
          />
        </Section>

        {/* ✅ UPDATED HOLDER SAFETY */}
        <Section title="Holder Safety">
          <MetricRow
            label="Largest Holder"
            value={formatValue(metrics?.largestHolderPercent, "%")}
          />
          <MetricRow
            label="Top 10 Holding"
            value={formatValue(metrics?.top10HoldingPercent, "%")}
          />

          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Top 5 Holders
            </div>

            {topHolders.length ? (
              <div className="space-y-2">
                {topHolders.slice(0, 5).map((holder, idx) => (
                  <div
                    key={`${holder.address || idx}-${idx}`}
                    className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {shortAddress(holder.address)}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 break-all">
                        {holder.address}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {holder.percent?.toFixed(2)}%
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Number(holder.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No top holders available.
              </div>
            )}
          </div>
        </Section>

        {/* rest of your file unchanged */}
      </div>
    </div>
  );
}