import { useState, useEffect } from "react";
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
 notifications,
}) {
  const evaluation = scanResult?.evaluation || null;
  const metrics = scanResult?.metrics || null;
  const token = scanResult?.token || null;
  const social = scanResult?.social || null;
const activity = scanResult?.activity || null;
  const integrity = scanResult?.integrity || null;
const integrityVerdict = integrity?.verdict || null;
  const rugRisk = scanResult?.rugRisk || null;
  const profitWallets = scanResult?.profitWallets || null;

const allWarnings = [
  ...(evaluation?.warnings || []),

  ...(social?.socialWarning
    ? [social.socialWarning]
    : []),

  ...(activity?.activityWarning
    ? [activity.activityWarning]
    : []),

  ...(integrity?.integrityWarning
    ? [integrity.integrityWarning]
    : []),

  ...(rugRisk?.rugWarning
    ? [rugRisk.rugWarning]
    : []),

  ...(profitWallets?.profitWalletWarning
    ? [profitWallets.profitWalletWarning]
    : []),
];

const [showTopHolders, setShowTopHolders] =
  useState(false);
const volumeAnalysis =
  scanResult?.volumeAnalysis || null;
const liquidityAnalysis =
  scanResult?.liquidityAnalysis || null;
const [buyToast, setBuyToast] =
  useState(null);
const [lastNotificationId, setLastNotificationId] =
  useState(null);

// Support both new and legacy API responses
const forecast =
  scanResult?.ai?.forecast ??
  scanResult?.forecast ??
  null;
const [showAnalysisSummary, setShowAnalysisSummary] =
  useState(false);

  const topHolders =
    scanResult?.holderSafety?.topHolders ||
    scanResult?.topHolders ||
    metrics?.topHolders ||
    [];


useEffect(() => {
  if (!notifications?.length) {
    return;
  }

  const latest = notifications[0];

  if (!latest?._id) {
    return;
  }

  if (latest._id === lastNotificationId) {
    return;
  }

  if (
    latest.title === "Buy Executed" ||
    latest.title === "Buy Failed"
  ) {
    setLastNotificationId(latest._id);

    setBuyToast({
      type: latest.type,
      title: latest.title,
      message: latest.message,
    });

    setTimeout(() => {
      setBuyToast(null);
    }, 3000);
  }
}, [notifications, lastNotificationId]);


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

      setBuyToast({
  type: "info",
  title: "Buy Queued",
  message:
    "Trade submitted successfully",
});

setTimeout(() => {
  setBuyToast(null);
}, 3000);

    } catch (err) {
      alert(err.message || "Manual buy failed");
    }
  }

  return (
    <div className="space-y-6">

     

      {/* ===================================================
          SCAN RESULT
          =================================================== */}

      {scanResult ? (
        <>

          {/* ===================================================
              LIVE CHART
              =================================================== */}

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


     


          {/* ===================================================
              FORECAST SNAPSHOT
              =================================================== */}

          {volumeAnalysis &&
          liquidityAnalysis &&
          forecast ? (

            <Section title="Forecast Snapshot">

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2">

                <div className="flex flex-wrap items-center gap-3 text-xs font-medium">

                  {/* VOL */}

                  <div>

                    <span className="text-gray-400">
                      VOL
                    </span>{" "}

                    <span className="font-semibold text-white">
                      {volumeAnalysis.volumeScore}
                    </span>

                  </div>


                  {/* LIQ */}

                  <div>

                    <span className="text-gray-400">
                      LIQ
                    </span>{" "}

                    <span className="font-semibold text-white">
                      {liquidityAnalysis.liquidityScore}
                    </span>

                  </div>


                  {/* FORECAST */}

                  <div>

                    <span className="text-gray-400">
                      FC
                    </span>{" "}

                    <span className="font-semibold text-white">
                      {forecast.forecastScore}
                    </span>

                  </div>


                  {/* FORECAST VERDICT */}

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


                  {/* 1H */}

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


                  {/* 24H */}

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


                  {/* 7D */}

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


                  {/* CONFIDENCE */}

                  <div>

                    <span className="text-gray-400">
                      CONF
                    </span>{" "}

                    <span className="font-semibold text-white">
                      {scanResult?.ai?.confidence ??
                        forecast.confidence ??
                        0}
                      %
                    </span>

                  </div>

                </div>

              </div>

            </Section>

          ) : null}


          {/* ===================================================
              CHART ENTRY ANALYSIS
              =================================================== */}

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

{integrityVerdict && (
  <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">

    <div className="flex items-center justify-between flex-wrap gap-2">

      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          integrityVerdict.color === "green"
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : integrityVerdict.color === "red"
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : integrityVerdict.color === "orange"
            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}
      >
        {integrityVerdict.title}
      </span>

      <span
  className={`px-2 py-1 rounded-full text-xs font-semibold ${
    integrityVerdict.level === "LOW"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : integrityVerdict.level === "MEDIUM"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : integrityVerdict.level === "MEDIUM_HIGH"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  }`}
>
  {integrityVerdict.level === "LOW"
    ? "🟢 Low Risk"
    : integrityVerdict.level === "MEDIUM"
    ? "🟡 Moderate Risk"
    : integrityVerdict.level === "MEDIUM_HIGH"
    ? "🟠 Elevated Risk"
    : "🔴 High Risk"}
</span>

<span className="text-xs text-gray-500 dark:text-gray-400">
  AI Confidence: {integrityVerdict.confidence}%
</span>

    </div>

    <div className="mt-3 space-y-1">

      {integrityVerdict.summary?.map((item, index) => (
        <div
          key={index}
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          • {item}
        </div>
      ))}

    </div>

  </div>
)}

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
</Section>

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

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">
        RUG
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.rugRiskScore ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        LEVEL
      </span>{" "}
      <span
        className={`font-semibold ${
          metrics?.riskLevel === "LOW"
            ? "text-green-400"
            : metrics?.riskLevel === "MEDIUM"
            ? "text-yellow-400"
            : "text-red-400"
        }`}
      >
        {metrics?.riskLevel || "LOW"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        DEV
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.devDumpRisk ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        LPULL
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.liquidityPullRisk ?? 0}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        INSIDER
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {metrics?.insiderControlRisk ?? 0}
      </span>
    </div>

  </div>

</Section>

<Section title="Evaluation">

  <div className="flex flex-wrap items-center gap-6 text-sm">

    <div>
      <span className="text-gray-400">
        VERDICT
      </span>{" "}
      <span
        className={`font-semibold ${
          verdict === "SAFE"
            ? "text-green-400"
            : verdict === "CAUTION"
            ? "text-yellow-400"
            : "text-red-400"
        }`}
      >
        {evaluation?.verdict || verdict || "UNKNOWN"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        SCORE
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {evaluation?.score ?? "—"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        SCANNED
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {evaluation?.scannedAt
          ? new Date(evaluation.scannedAt).toLocaleTimeString()
          : "—"}
      </span>
    </div>

    <div>
      <span className="text-gray-400">
        EXPIRES
      </span>{" "}
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {evaluation?.expiresAt
          ? new Date(evaluation.expiresAt).toLocaleTimeString()
          : "—"}
      </span>
    </div>

  </div>

</Section>
          </div>

          {(
  evaluation?.reasons?.length > 0 ||
  allWarnings.length > 0 ||
  evaluation?.failedRules?.length > 0 ||
  social?.socialWarning ||
  scanResult?.activity?.activityWarning ||
  integrity?.integrityWarning ||
  rugRisk?.rugWarning ||
  profitWallets?.profitWalletWarning
) ? (

            <div className="grid grid-cols-1 gap-6">

             <Section title="Analysis Summary">

  <div className="flex items-center justify-between">

    <div className="flex gap-6 text-sm">

      <div>
        <span className="text-green-400 font-semibold">
          ✓ {evaluation?.reasons?.length || 0}
        </span>{" "}
        Reasons
      </div>

      <div>
        <span className="text-yellow-400 font-semibold">
          ⚠ {allWarnings.length}
        </span>{" "}
        Warnings
      </div>

      <div>
        <span className="text-red-400 font-semibold">
          ✕ {evaluation?.failedRules?.length || 0}
        </span>{" "}
        Failed
      </div>

    </div>

    <button
      type="button"
      onClick={() =>
        setShowAnalysisSummary(
          !showAnalysisSummary
        )
      }
      className="text-blue-500 hover:text-blue-400 font-semibold"
    >
      {showAnalysisSummary
        ? "Hide ▲"
        : "Show ▼"}
    </button>

  </div>

  {showAnalysisSummary && (
    <div className="mt-4 space-y-4">

      {(evaluation?.reasons?.length ?? 0) > 0 && (
        <div>
          <div className="text-green-400 font-semibold mb-2">
            Reasons
          </div>

          <div className="space-y-1 text-sm">
            {evaluation.reasons.map((reason, idx) => (
              <div key={idx}>
                ✓ {reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {allWarnings.length > 0 && (
        <div>
          <div className="text-yellow-400 font-semibold mb-2">
            Warnings
          </div>

          <div className="space-y-1 text-sm">
            {allWarnings.map((warning, idx) => (
              <div key={idx}>
                ⚠ {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {(evaluation?.failedRules?.length ?? 0) > 0 && (
        <div>
          <div className="text-red-400 font-semibold mb-2">
            Failed Rules
          </div>

          <div className="space-y-1 text-sm">
            {evaluation.failedRules.map((rule, idx) => (
              <div key={idx}>
                ✕ {rule}
              </div>
            ))}
          </div>
        </div>
      )}

      {!evaluation?.reasons?.length &&
       !allWarnings.length &&
       !evaluation?.failedRules?.length && (
        <div className="text-gray-500 text-sm">
          No analysis details available.
        </div>
      )}

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