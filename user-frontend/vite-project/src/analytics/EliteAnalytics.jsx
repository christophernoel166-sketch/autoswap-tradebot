export default function EliteAnalytics({
  historyLoading,
  filteredTradesCount,
  metrics,
  distribution,
  renderCumulativePath,
  fmt,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm mb-4">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Elite Analytics
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {historyLoading
            ? "Loading..."
            : `${filteredTradesCount} trades selected`}
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-6 gap-3 mt-4 text-center">
        {[
          ["Sharpe", fmt(metrics.sharpe, 2)],
          ["Sortino", fmt(metrics.sortino, 2)],
          ["Max Drawdown", fmt(metrics.maxDrawdown, 4)],
          ["Avg Drawdown", fmt(metrics.avgDrawdown, 4)],
          [
            "Profit Factor",
            metrics.profitFactor === Infinity ? "∞" : fmt(metrics.profitFactor, 2),
          ],
          ["Risk of Ruin", fmt(metrics.riskOfRuin, 4)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="p-2 border dark:border-gray-700 rounded
                       bg-gray-50 dark:bg-gray-700"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {label}
            </div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="mt-4 grid grid-cols-2 gap-4">

        {/* CUMULATIVE PNL */}
        <div className="p-2 border dark:border-gray-700 rounded bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Cumulative PnL
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              total: {fmt(metrics.totalPnl, 6)} SOL
            </div>
          </div>

          <svg
            width="100%"
            height="140"
            viewBox="0 0 760 140"
            preserveAspectRatio="none"
          >
            <rect width="760" height="140" fill="transparent" />
            {(() => {
              const points = renderCumulativePath(
                metrics.pnlSeries,
                760,
                140,
                12
              );
              if (!points) return null;

              const isPositive =
                Math.max(...(metrics.pnlSeries || [0])) >= 0;

              return (
                <polyline
                  fill="none"
                  stroke={isPositive ? "#22c55e" : "#ef4444"}
                  strokeWidth={2}
                  points={points}
                />
              );
            })()}
          </svg>
        </div>

        {/* PROFIT DISTRIBUTION */}
        <div className="p-2 border dark:border-gray-700 rounded bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Profit Distribution
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              buckets: {distribution.length}
            </div>
          </div>

          <svg
            width="100%"
            height="140"
            viewBox="0 0 760 140"
            preserveAspectRatio="none"
          >
            <rect width="760" height="140" fill="transparent" />
            {distribution.map((d, i) => {
              const maxCount = Math.max(
                ...distribution.map((x) => x.count),
                1
              );
              const barWidth = 760 / distribution.length;
              const height = (d.count / maxCount) * 120;

              return (
                <rect
                  key={i}
                  x={i * barWidth + 4}
                  y={140 - height}
                  width={Math.max(6, barWidth - 6)}
                  height={height}
                  fill={d.bucket >= 0 ? "#6366f1" : "#ef4444"}
                />
              );
            })}
          </svg>

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Positive buckets to the right, negative to the left
          </div>
        </div>
      </div>
    </div>
  );
}
