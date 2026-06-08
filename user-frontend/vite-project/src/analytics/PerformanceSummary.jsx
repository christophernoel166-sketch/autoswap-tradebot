export default function PerformanceSummary({
  totalPnl,
  metrics,
  tokenFilter,
  setTokenFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  fmt,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm mb-3">

      <div className="flex flex-wrap items-center gap-8 text-sm">

        <div>
          <span className="text-gray-400">
            PNL
          </span>{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {fmt(metrics.totalPnl, 6)} SOL
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            WIN
          </span>{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {fmt(metrics.winRate, 1)}%
          </span>
        </div>

        <div>
          <span className="text-gray-400">
            TRADES
          </span>{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {metrics.trades}
          </span>
        </div>

      </div>

    </div>
  );
}