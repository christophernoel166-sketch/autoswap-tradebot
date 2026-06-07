import React, { useState } from "react";
import ChartEntrySection from "../components/ChartEntrySection";

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

// AGE FUNCTION
function formatTokenAge(minutes) {
  const n = Number(minutes);

  if (!Number.isFinite(n)) return "—";

  if (n < 60) {
    return `${Math.round(n)} minutes`;
  }

  if (n < 1440) {
    const hours = Math.floor(n / 60);
    const mins = Math.round(n % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  const days = Math.floor(n / 1440);
  const hours = Math.floor((n % 1440) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

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
  chartEntry,
  chartLoading,
  chartError,
  handleChartAnalysis,
showChartConfirm,
setShowChartConfirm,
}) {
  const evaluation = scanResult?.evaluation || null;
  const metrics = scanResult?.metrics || null;
  const token = scanResult?.token || null;
  const social = scanResult?.social || null;
const activity = scanResult?.activity || null;
  const integrity = scanResult?.integrity || null;
  const rugRisk = scanResult?.rugRisk || null;
  const profitWallets = scanResult?.profitWallets || null;
const [showTopHolders, setShowTopHolders] =
  useState(false);
const volumeAnalysis =
  scanResult?.volumeAnalysis || null;
const liquidityAnalysis =
  scanResult?.liquidityAnalysis || null;

const forecast =
  scanResult?.forecast || null;


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

const chartActionColor =
  chartEntry?.action === "enter_now"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : chartEntry?.action === "wait_pullback" ||
      chartEntry?.action === "wait_breakout"
    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

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
      <Section title="Manual Token Scan">
        <div className="space-y-3">
          <input
            type="text"
            value={manualTokenMint}
            onChange={(e) => setManualTokenMint(e.target.value)}
            placeholder="Paste token contract address"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
          />

          <button
            onClick={scanManualToken}
            disabled={scanLoading || !manualTokenMint.trim()}
            className="w-full sm:w-auto px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanLoading ? "Scanning..." : "Scan Token"}
          </button>

          {scanError ? (
            <div className="text-sm text-red-600 dark:text-red-400">
              {scanError}
            </div>
          ) : null}
        </div>
      </Section>

      {scanResult ? (
        <>
          {scanResult?.pairAddress ? (
            <Section title="Live Chart">
              <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <iframe
                  title="Token Chart"
                  src={`https://dexscreener.com/solana/${scanResult.pairAddress}?embed=1&theme=dark`}
                  className="w-full h-[420px] bg-white dark:bg-gray-900"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            </Section>
          ) : (
            <Section title="Live Chart">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Chart not available for this token.
              </div>
            </Section>
          )}

          <Section title="Scan Summary">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {token?.name || "Scanned Token"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 break-all">
                  {token?.mintAddress || manualTokenMint}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {token?.boosted ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Boosted
                  </span>
                ) : null}

               
              </div>
            </div>


<div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
  <div className="flex flex-wrap items-center gap-5 text-sm">

    <div>
      <span className="text-gray-400">
        SCORE
      </span>{" "}
      <span className="font-bold text-white">
        {formatValue(evaluation?.score)}
      </span>
    </div>

   <div>
  <span className="text-gray-400">
    STATUS
  </span>{" "}
  <span
    className={`font-bold ${
      verdict === "SAFE"
        ? "text-green-400"
        : verdict === "CAUTION"
        ? "text-yellow-400"
        : "text-red-400"
    }`}
  >
    {verdict}
  </span>
</div>

    <div>
      <span className="text-gray-400">
        EXPIRES
      </span>{" "}
      <span className="font-semibold text-white">
        {scanResult?.expiresAt
          ? new Date(
              scanResult.expiresAt
            ).toLocaleTimeString()
          : "—"}
      </span>
    </div>




   

   <div className="ml-auto flex items-center gap-2">
  {!chartEntry ? (
    <button
      type="button"
      onClick={() => setShowChartConfirm(true)}
      disabled={chartLoading || !walletAddress}
      className="px-3 py-1 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
    >
      {chartLoading
        ? "Loading..."
        : "Chart Analysis"}
    </button>
  ) : (
    <span className="text-green-400 text-xs font-semibold">
      ✓ Chart Ready
    </span>
  )}

  <button
    type="button"
    onClick={handleManualBuy}
    disabled={!showBuy || !walletAddress}
    className={`px-3 py-1 rounded-md text-xs font-medium ${buyButtonClass}`}
  >
    {buyConfidence === "MEDIUM"
      ? "Buy (Caution)"
      : "Buy"}
  </button>
</div> 

  </div>
</div>



{!showBuy ? (
  <div className="mt-4 text-sm text-yellow-700 dark:text-yellow-400">
    Buy is unavailable for this token right now.
  </div>
) : buyConfidence === "MEDIUM" ? (
  <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-400">
    ⚠️ Caution trade: token is tradable but not in the safest category.
  </div>
) : null}

              
          </Section>



{volumeAnalysis &&
 liquidityAnalysis &&
 forecast ? (
  <Section title="Forecast Snapshot">
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2">
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium">

        <div>
          <span className="text-gray-400">
            VOL
          </span>{" "}
          <span className="font-semibold text-white">
            {volumeAnalysis.volumeScore}
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            LIQ
          </span>{" "}
          <span className="font-semibold text-white">
            {liquidityAnalysis.liquidityScore}
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            FC
          </span>{" "}
          <span className="font-semibold text-white">
            {forecast.forecastScore}
          </span>
        </div>

        <div>
          <span
            className={`font-semibold ${
              forecast.verdict.includes("BULLISH")
                ? "text-green-400"
                : forecast.verdict.includes("BEARISH")
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {forecast.verdict}
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            1H
          </span>{" "}
          <span
            className={`font-semibold ${
              forecast.shortTerm?.verdict?.includes("BULLISH")
                ? "text-green-400"
                : forecast.shortTerm?.verdict?.includes("BEARISH")
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {forecast.shortTerm?.verdict || "-"}
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            24H
          </span>{" "}
          <span
            className={`font-semibold ${
              forecast.midTerm?.verdict?.includes("BULLISH")
                ? "text-green-400"
                : forecast.midTerm?.verdict?.includes("BEARISH")
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {forecast.midTerm?.verdict || "-"}
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            7D
          </span>{" "}
          <span
            className={`font-semibold ${
              forecast.longTerm?.verdict?.includes("BULLISH")
                ? "text-green-400"
                : forecast.longTerm?.verdict?.includes("BEARISH")
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {forecast.longTerm?.verdict || "-"}
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            CONF
          </span>{" "}
          <span className="font-semibold text-white">
            {forecast.confidence}%
          </span>
        </div>

      </div>
    </div>
  </Section>
) : null}

<ChartEntrySection
  chartEntry={chartEntry}
  chartActionColor={chartActionColor}
  formatValue={formatValue}
  Section={Section}
  MetricRow={MetricRow}
/>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

<Section title="">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">AGE</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {formatTokenAge(metrics?.ageMinutes)}
      </span>
    </div>

    <div>
      <span className="text-gray-400">LIQ</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {formatUsd(metrics?.liquidityUsd)}
      </span>
    </div>

    <div>
      <span className="text-gray-400">MCAP</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {formatUsd(metrics?.marketCapUsd)}
      </span>
    </div>

    <div>
      <span className="text-gray-400">VOL</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {formatUsd(metrics?.volume5mUsd)}
      </span>
    </div>

    <div>
      <span className="text-gray-400">LOCK</span>{" "}
      <span
        className={`font-semibold ${
          metrics?.liquidityLocked === true
            ? "text-green-400"
            : metrics?.liquidityLocked === false
            ? "text-red-400"
            : "text-yellow-400"
        }`}
      >
        {metrics?.liquidityLocked === true
          ? "YES"
          : metrics?.liquidityLocked === false
          ? "NO"
          : "UNK"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">B/S</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {formatValue(metrics?.buys5m)}/
        {formatValue(metrics?.sells5m)}
      </span>
    </div>

  </div>

</Section>

         <Section title="Holder Safety">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">
        LH
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {formatValue(
          metrics?.largestHolderPercent,
          "%"
        )}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        TOP10
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {formatValue(
          metrics?.top10HoldingPercent,
          "%"
        )}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        HOLDERS
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {topHolders.length}
      </span>
    </div>

    <button
      type="button"
      onClick={() =>
        setShowTopHolders(
          !showTopHolders
        )
      }
      className="ml-auto text-blue-500 hover:text-blue-400 font-semibold"
    >
      {showTopHolders
        ? "Hide ▲"
        : "Show ▼"}
    </button>

  </div>

  {showTopHolders && (
    <div className="mt-3 space-y-2">

      {topHolders.length ? (
        topHolders
          .slice(0, 5)
          .map((holder, idx) => (
            <div
              key={`${holder.address || holder.owner || idx}-${idx}`}
              className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-2"
            >
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {shortAddress(
                    holder.address ||
                    holder.owner
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  {holder.address ||
                    holder.owner}
                </div>
              </div>

              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {holder.percent != null
                  ? `${Number(
                      holder.percent
                    ).toFixed(2)}%`
                  : "—"}
              </div>
            </div>
          ))
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No top holders available.
        </div>
      )}

    </div>
  )}

</Section>

            
<Section title="Social / Presence">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">WEB</span>{" "}
      <span
        className={`font-semibold ${
          social?.hasWebsite
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {social?.hasWebsite ? "OPEN" : "NONE"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">TG</span>{" "}
      <span
        className={`font-semibold ${
          social?.hasTelegram
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {social?.hasTelegram ? "OPEN" : "NONE"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">X</span>{" "}
      <span
        className={`font-semibold ${
          social?.hasTwitter
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {social?.hasTwitter ? "OPEN" : "NONE"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">WEB✓</span>{" "}
      <span
        className={`font-semibold ${
          social?.websiteWorking
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {social?.websiteWorking ? "LIVE" : "DOWN"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">TG✓</span>{" "}
      <span
        className={`font-semibold ${
          social?.telegramWorking
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {social?.telegramWorking ? "LIVE" : "DOWN"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">X✓</span>{" "}
      <span
        className={`font-semibold ${
          social?.twitterWorking
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {social?.twitterWorking ? "LIVE" : "DOWN"}
      </span>
    </div>

  </div>

</Section>


<Section title="Activity / Alpha">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">ALPHA</span>{" "}
      <span className="font-semibold text-white">
        {activity?.alphaCallerCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">A-SCORE</span>{" "}
      <span className="font-semibold text-white">
        {activity?.alphaCallerScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">X-ACT</span>{" "}
      <span className="font-semibold text-white">
        {activity?.xActivityScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">TG-ACT</span>{" "}
      <span className="font-semibold text-white">
        {activity?.telegramActivityScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">X-REPLY</span>{" "}
      <span className="font-semibold text-white">
        {activity?.xReplyCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">TG-REPLY</span>{" "}
      <span className="font-semibold text-white">
        {activity?.telegramReplyCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">BUY</span>{" "}
      <span
        className={`font-semibold ${
          buyConfidence === "HIGH"
            ? "text-green-400"
            : buyConfidence === "MEDIUM"
            ? "text-yellow-400"
            : "text-red-400"
        }`}
      >
        {buyConfidence || "UNKNOWN"}
      </span>
    </div>

  </div>

</Section>

           <Section title="Market Integrity">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">
        BSR
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {integrity?.buySellRatio5m ?? "N/A"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        PART
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {integrity?.walletParticipationScore ?? "N/A"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        VEL
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {integrity?.velocitySanityScore ?? "N/A"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        WASH
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {integrity?.washTradingRiskScore ?? "N/A"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        BUNDLE
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {integrity?.bundleSuspicionScore ?? "N/A"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        FAKE
      </span>{" "}
      <span
        className={`font-semibold ${
          integrity?.fakeMomentumFlag
            ? "text-red-400"
            : "text-green-400"
        }`}
      >
        {integrity?.fakeMomentumFlag ? "YES" : "NO"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        AVOL
      </span>{" "}
      <span
        className={`font-semibold ${
          integrity?.artificialVolumeFlag
            ? "text-red-400"
            : "text-green-400"
        }`}
      >
        {integrity?.artificialVolumeFlag ? "YES" : "NO"}
      </span>
    </div>

  </div>

</Section>


            <Section title="Wallet Intelligence">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">SMART</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.smartDegenCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">BOT</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.botDegenCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">RAT</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.ratTraderCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">ALPHA</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.alphaCallerCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">SNIPER</span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.sniperWalletCount ?? 0}
      </span>
    </div>

  </div>

</Section>

            <Section title="Profit Wallet Intelligence">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">
        P-WALLET
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.profitableWalletCount ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        QUALITY
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.walletQualityScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        CONF
      </span>{" "}
      <span className="font-semibold text-green-400">
        {metrics?.profitWalletConfidence ?? 0}
      </span>
    </div>

  </div>

</Section>

           <Section title="Risk / Structure">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">
        BUNDLE
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.bundleScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        B-WALLET
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.bundledWallets ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        FUND
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.fundingClusterScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        L-FUND
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.largestFundingCluster ?? 0}
      </span>
    </div>

  </div>

<Section title="Momentum">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">
        MOM
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.momentumScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        V-BREAK
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.velocityBreakoutScore ?? 0}
      </span>
    </div>

  </div>

</Section>

            <Section title="Rug Risk Analysis">
              <MetricRow
                label="Rug Risk Score"
                value={
                  rugRisk?.rugRiskScore != null
                    ? rugRisk.rugRiskScore
                    : "Not Available"
                }
              />
              <MetricRow
                label="Risk Level"
                value={
                  rugRisk?.rugRiskLevel != null
                    ? rugRisk.rugRiskLevel
                    : "Not Available"
                }
              />
              <MetricRow
                label="Dev Dump Risk"
                value={
                  rugRisk?.devDumpRiskScore != null
                    ? rugRisk.devDumpRiskScore
                    : "Not Available"
                }
              />
              <MetricRow
                label="Liquidity Pull Risk"
                value={
                  rugRisk?.liquidityPullRiskScore != null
                    ? rugRisk.liquidityPullRiskScore
                    : "Not Available"
                }
              />
              <MetricRow
                label="Insider Control Risk"
                value={
                  rugRisk?.insiderRiskScore != null
                    ? rugRisk.insiderRiskScore
                    : "Not Available"
                }
              />
            </Section>

            <Section title="Evaluation">
              <MetricRow label="Verdict" value={formatValue(verdict)} />
              <MetricRow label="Score" value={formatValue(evaluation?.score)} />
              <MetricRow
                label="Scanned At"
                value={
                  scanResult?.scannedAt
                    ? new Date(scanResult.scannedAt).toLocaleString()
                    : "—"
                }
              />
              <MetricRow
                label="Expires At"
                value={
                  scanResult?.expiresAt
                    ? new Date(scanResult.expiresAt).toLocaleString()
                    : "—"
                }
              />
            </Section>
          </div>

          {(evaluation?.reasons?.length > 0 ||
            evaluation?.warnings?.length > 0 ||
            evaluation?.failedRules?.length > 0 ||
            social?.socialWarning ||
            scanResult?.activity?.activityWarning ||
            integrity?.integrityWarning ||
            rugRisk?.rugWarning ||
            profitWallets?.profitWalletWarning) ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Section title="Reasons">
                {evaluation?.reasons?.length ? (
                  <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                    {evaluation.reasons.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No reasons available.
                  </div>
                )}
              </Section>

              <Section title="Warnings">
                {evaluation?.warnings?.length ||
                social?.socialWarning ||
                scanResult?.activity?.activityWarning ||
                integrity?.integrityWarning ||
                rugRisk?.rugWarning ||
                profitWallets?.profitWalletWarning ? (
                  <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                    {evaluation?.warnings?.map((item, idx) => (
                      <li key={`warn-${idx}`}>• {item}</li>
                    ))}

                    {social?.socialWarning ? (
                      <li>• {social.socialWarning}</li>
                    ) : null}

                    {scanResult?.activity?.activityWarning ? (
                      <li>• {scanResult.activity.activityWarning}</li>
                    ) : null}

                    {integrity?.integrityWarning ? (
                      <li>• {integrity.integrityWarning}</li>
                    ) : null}

                    {rugRisk?.rugWarning ? (
                      <li>• {rugRisk.rugWarning}</li>
                    ) : null}

                    {profitWallets?.profitWalletWarning ? (
                      <li>• {profitWallets.profitWalletWarning}</li>
                    ) : null}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No warnings.
                  </div>
                )}
              </Section>

              <Section title="Failed Rules">
                {evaluation?.failedRules?.length ? (
                  <ul className="space-y-2 text-sm text-red-600 dark:text-red-400">
                    {evaluation.failedRules.map((item, idx) => (
                      <li key={`fail-${idx}`}>• {item}</li>
                    ))}
                  </ul>
                               ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No failed rules.
                  </div>
                )}
              </Section>
            </div>
          ) : null}
        </>
      ) : null}

      {showChartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Activate Chart Analysis
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              This will run advanced chart analysis to help you find the best entry.
              <br /><br />
              Advanced chart analysis is provided <span className="font-semibold">free of charge</span>.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowChartConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  setShowChartConfirm(false);
                  await handleChartAnalysis();
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}