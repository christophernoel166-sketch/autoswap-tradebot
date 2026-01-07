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
    <div className="bg-white p-4 rounded shadow mb-3">
      {/* TOP METRICS */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500 text-sm">Total PnL</div>
          <div className="text-xl font-semibold">
            {fmt(metrics.totalPnl, 6)} SOL
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500 text-sm">Win Rate</div>
          <div className="text-xl font-semibold">
            {fmt(metrics.winRate, 1)}%
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500 text-sm">Trades</div>
          <div className="text-xl font-semibold">
            {metrics.trades}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <input
          className="border px-2 py-1 rounded"
          placeholder="Filter token"
          value={tokenFilter}
          onChange={(e) => setTokenFilter(e.target.value)}
        />

        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />

        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>
    </div>
  );
}
