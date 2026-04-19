import React from "react";

export default function ChartEntrySection({
  chartEntry,
  chartActionColor,
  formatValue,
  Section,
  MetricRow,
}) {
  if (!chartEntry) return null;

  return (
    <Section title="Chart Entry Analysis">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {chartEntry?.setupType
              ? chartEntry.setupType.replaceAll("_", " ").toUpperCase()
              : "Chart Entry"}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Structure: {chartEntry?.structure || "UNKNOWN"}
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${chartActionColor}`}
        >
          {chartEntry?.action
            ? chartEntry.action.replaceAll("_", " ").toUpperCase()
            : "UNKNOWN"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <MetricRow
          label="Confidence"
          value={formatValue(chartEntry?.confidence, "%")}
        />
        <MetricRow
          label="Score"
          value={formatValue(chartEntry?.score)}
        />
        <MetricRow
          label="Trend Strength"
          value={formatValue(chartEntry?.metrics?.trendStrength, "%")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <MetricRow label="Current Price" value={formatValue(chartEntry?.metrics?.currentPrice)} />
          <MetricRow label="Entry Low" value={formatValue(chartEntry?.entryZone?.low)} />
          <MetricRow label="Entry High" value={formatValue(chartEntry?.entryZone?.high)} />
          <MetricRow label="Ideal Entry" value={formatValue(chartEntry?.entryZone?.ideal)} />
          <MetricRow label="Stop Loss" value={formatValue(chartEntry?.stopLoss)} />
          <MetricRow label="TP1" value={formatValue(chartEntry?.targets?.tp1)} />
          <MetricRow label="TP2" value={formatValue(chartEntry?.targets?.tp2)} />
        </div>

        <div className="space-y-2">
          <MetricRow label="EMA20" value={formatValue(chartEntry?.metrics?.ema20)} />
          <MetricRow label="EMA50" value={formatValue(chartEntry?.metrics?.ema50)} />
          <MetricRow label="EMA200" value={formatValue(chartEntry?.metrics?.ema200)} />
          <MetricRow label="RSI" value={formatValue(chartEntry?.metrics?.rsi14)} />
          <MetricRow label="ATR" value={formatValue(chartEntry?.metrics?.atr14)} />
          <MetricRow label="Support" value={formatValue(chartEntry?.metrics?.support)} />
          <MetricRow label="Resistance" value={formatValue(chartEntry?.metrics?.resistance)} />
        </div>
      </div>

      {chartEntry?.invalidation && (
        <div className="mt-4 text-sm text-yellow-700 dark:text-yellow-400">
          <strong>Invalidation:</strong> {chartEntry.invalidation}
        </div>
      )}
    </Section>
  );
}