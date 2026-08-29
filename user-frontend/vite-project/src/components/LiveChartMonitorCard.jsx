import React from "react";

/* ==========================================================
   HELPERS
========================================================== */

function formatAction(action) {
  if (!action) return "WAITING";

  return String(action)
    .replaceAll("_", " ")
    .toUpperCase();
}

function formatSetupType(setupType) {
  if (!setupType) return "NO SETUP";

  return String(setupType)
    .replaceAll("_", " ")
    .toUpperCase();
}

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  if (number >= 1) {
    return `$${number.toFixed(4)}`;
  }

  if (number >= 0.01) {
    return `$${number.toFixed(6)}`;
  }

  if (number >= 0.000001) {
    return `$${number.toFixed(8)}`;
  }

  return `$${number.toExponential(4)}`;
}

function getActionConfig(action) {
  switch (action) {
    case "enter_now":
      return {
        label: "ENTRY CONFIRMED",
        description:
          "The chart monitor has detected that the monitored setup now satisfies the entry conditions.",
        icon: "🟢",
        container:
          "border-green-500/30 bg-green-500/10",
        title:
          "text-green-300",
        badge:
          "border-green-500/30 bg-green-500/10 text-green-400",
      };

    case "wait_pullback":
      return {
        label: "WAIT FOR PULLBACK",
        description:
          "The chart remains under observation. AI is waiting for price to retrace into the monitored entry zone.",
        icon: "🟡",
        container:
          "border-yellow-500/30 bg-yellow-500/10",
        title:
          "text-yellow-300",
        badge:
          "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      };

    case "wait_breakout":
      return {
        label: "WAIT FOR BREAKOUT",
        description:
          "The chart is being monitored for a clean breakout confirmation before entry.",
        icon: "🔵",
        container:
          "border-cyan-500/30 bg-cyan-500/10",
        title:
          "text-cyan-300",
        badge:
          "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
      };

    case "avoid":
      return {
        label: "SETUP INVALIDATED",
        description:
          "The chart no longer supports the monitored entry setup.",
        icon: "🔴",
        container:
          "border-red-500/30 bg-red-500/10",
        title:
          "text-red-300",
        badge:
          "border-red-500/30 bg-red-500/10 text-red-400",
      };

    default:
      return {
        label: formatAction(action),
        description:
          "The chart monitor is processing the current setup.",
        icon: "⚪",
        container:
          "border-gray-700/60 bg-gray-900/60",
        title:
          "text-gray-300",
        badge:
          "border-gray-700/60 bg-gray-800 text-gray-300",
      };
  }
}

function Metric({
  label,
  value,
  valueClass = "text-white",
}) {
  return (
    <div className="rounded-lg border border-gray-700/60 bg-gray-900/70 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div
        className={`mt-1 break-all text-sm font-semibold ${valueClass}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function LiveChartMonitorCard({
  watch,
}) {
  if (!watch) {
    return null;
  }

  /*
   * The initial chart analysis comes from chartEntry.
   *
   * Future live socket updates will replace this snapshot
   * without changing this component's structure.
   */
  const chart =
    watch.chartEntry ||
    watch.analysis ||
    watch.latestAnalysis ||
    {};

  const metrics =
    chart.metrics ||
    {};

  const action =
    watch.action ||
    chart.action ||
    "unknown";

  const setupType =
    watch.setupType ||
    chart.setupType ||
    "no_setup";

  const trend =
    watch.trend ||
    metrics.trend ||
    chart.trend ||
    "unknown";

  const confidence =
    Number(
      watch.confidence ??
        chart.confidence ??
        metrics.confidence ??
        0
    );

  const entryMin =
    watch.entryMin ??
    metrics.entryMin ??
    chart.entryMin ??
    chart.entryZone?.low ??
    null;

  const entryMax =
    watch.entryMax ??
    metrics.entryMax ??
    chart.entryMax ??
    chart.entryZone?.high ??
    null;

  const idealEntry =
    watch.idealEntry ??
    metrics.idealEntry ??
    chart.idealEntry ??
    chart.entryZone?.ideal ??
    null;

  const breakoutLevel =
    watch.breakoutLevel ??
    metrics.breakoutLevel ??
    chart.breakoutLevel ??
    null;

  const invalidationLevel =
    watch.invalidationLevel ??
    metrics.invalidationLevel ??
    chart.invalidationLevel ??
    null;

  const takeProfitLevel =
    watch.takeProfitLevel ??
    metrics.takeProfitLevel ??
    chart.takeProfitLevel ??
    chart.targets?.tp1 ??
    null;

  const currentPrice =
    watch.lastPrice ??
    metrics.currentPrice ??
    chart.currentPrice ??
    null;

  const monitorCount =
    Number(watch.monitorCount ?? 0);

  const watchId =
    watch.watchId ??
    watch._id ??
    null;

  const lastCheckedAt =
    watch.lastCheckedAt ??
    chart.lastUpdatedAt ??
    null;

  const event =
    watch.lastEvent ??
    watch.event ??
    null;

  const config =
    getActionConfig(action);

  const normalizedConfidence = Math.max(
    0,
    Math.min(100, confidence)
  );

  const isEntryConfirmed =
    action === "enter_now";

  const isInvalidated =
    action === "avoid";

  return (
    <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-cyan-500/20 bg-cyan-500/5">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="border-b border-gray-700/60 px-4 py-4">
        <div className="flex items-start justify-between gap-4">

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-cyan-400">
                Live Chart Monitor
              </span>

              <span className="flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                MONITORING
              </span>
            </div>

            <div className="mt-1 text-xs text-gray-500">
              AI is monitoring the chart setup for entry confirmation
            </div>
          </div>

          <div
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${config.badge}`}
          >
            {formatAction(action)}
          </div>

        </div>
      </div>

      {/* ====================================================
          CURRENT STATE
      ==================================================== */}

      <div className="px-4 py-4">

        <div
          className={`rounded-xl border p-4 ${config.container}`}
        >
          <div className="flex items-start gap-3">

            <div className="text-2xl">
              {config.icon}
            </div>

            <div className="min-w-0 flex-1">

              <div
                className={`text-lg font-bold ${config.title}`}
              >
                {config.label}
              </div>

              <div className="mt-1 text-xs leading-relaxed text-gray-400">
                {config.description}
              </div>

            </div>

          </div>

          {event && (
            <div className="mt-3 rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">
                Latest Event
              </div>

              <div className="mt-1 text-xs font-semibold text-white">
                {formatAction(event)}
              </div>
            </div>
          )}

        </div>

        {/* ==================================================
            SETUP INFORMATION
        ================================================== */}

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">

          <Metric
            label="Setup"
            value={formatSetupType(setupType)}
            valueClass="text-cyan-300"
          />

          <Metric
            label="Trend"
            value={String(trend).toUpperCase()}
            valueClass={
              String(trend).toLowerCase() === "bullish"
                ? "text-green-400"
                : String(trend).toLowerCase() === "bearish"
                ? "text-red-400"
                : "text-yellow-400"
            }
          />

          <Metric
            label="Confidence"
            value={`${normalizedConfidence}%`}
            valueClass="text-cyan-300"
          />

          <Metric
            label="Current Price"
            value={formatPrice(currentPrice)}
          />

          <Metric
            label="Entry Zone"
            value={
              entryMin != null && entryMax != null
                ? `${formatPrice(entryMin)} – ${formatPrice(entryMax)}`
                : "--"
            }
          />

          <Metric
            label="Ideal Entry"
            value={formatPrice(idealEntry)}
            valueClass="text-green-400"
          />

        </div>

        {/* ==================================================
            LEVELS
        ================================================== */}

        {(breakoutLevel != null ||
          invalidationLevel != null ||
          takeProfitLevel != null) && (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">

            <Metric
              label="Breakout Level"
              value={formatPrice(breakoutLevel)}
              valueClass="text-cyan-300"
            />

            <Metric
              label="Invalidation"
              value={formatPrice(invalidationLevel)}
              valueClass="text-red-400"
            />

            <Metric
              label="TP1"
              value={formatPrice(takeProfitLevel)}
              valueClass="text-green-400"
            />

          </div>
        )}

        {/* ==================================================
            CONFIDENCE BAR
        ================================================== */}

        <div className="mt-4">

          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-gray-500">
              Chart Confidence
            </span>

            <span className="text-xs font-semibold text-cyan-300">
              {normalizedConfidence}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isEntryConfirmed
                  ? "bg-green-400"
                  : isInvalidated
                  ? "bg-red-400"
                  : "bg-cyan-400"
              }`}
              style={{
                width: `${normalizedConfidence}%`,
              }}
            />
          </div>

        </div>

        {/* ==================================================
            MONITOR STATUS
        ================================================== */}

        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-gray-700/50 bg-gray-900/60 px-3 py-3 text-xs md:flex-row md:items-center md:justify-between">

          <div>
            <span className="text-gray-500">
              Monitor checks:
            </span>

            <span className="ml-2 font-semibold text-white">
              {monitorCount || "--"}
            </span>
          </div>

          <div>
            <span className="text-gray-500">
              Last checked:
            </span>

            <span className="ml-2 font-semibold text-white">
              {lastCheckedAt
                ? new Date(lastCheckedAt).toLocaleTimeString()
                : "--"}
            </span>
          </div>

        </div>

        {/* ==================================================
            ENTRY CONFIRMATION
        ================================================== */}

        {isEntryConfirmed && (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
            <div className="text-sm font-bold text-green-300">
              ⚡ ENTRY OPPORTUNITY DETECTED
            </div>

            <div className="mt-1 text-xs text-green-200/70">
              The monitored chart setup has transitioned into
              an active entry condition.
            </div>
          </div>
        )}

        {/* ==================================================
            INVALIDATION
        ================================================== */}

        {isInvalidated && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <div className="text-sm font-bold text-red-300">
              ⚠ SETUP NO LONGER VALID
            </div>

            <div className="mt-1 text-xs text-red-200/70">
              The monitored chart setup has been invalidated.
            </div>
          </div>
        )}

        {/* ==================================================
            WATCH ID
        ================================================== */}

        {watchId && (
          <div className="mt-3 text-[10px] text-gray-600">
            Watch ID: {String(watchId)}
          </div>
        )}

      </div>
    </div>
  );
}