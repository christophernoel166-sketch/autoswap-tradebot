export default function ActivePositions({
  positions,
  loading,
  fetchPositions,
  manualSell,
  manualSellAll,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm mt-6 mb-10">

      {/* HEADER */}
      <div className="flex justify-between mb-3 items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Active Positions
        </h2>

        <div className="flex gap-2">
          <button
            onClick={fetchPositions}
            className="px-3 py-1 border dark:border-gray-700
                       bg-white dark:bg-gray-700
                       text-sm rounded
                       text-gray-900 dark:text-gray-100"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>

          <button
            onClick={manualSellAll}
            className="px-3 py-1 border dark:border-gray-700
                       bg-white dark:bg-gray-700
                       text-sm rounded
                       text-gray-900 dark:text-gray-100"
          >
            Sell All
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {positions.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No active positions.
        </div>
      ) : (
        <>
          {/* ================= MOBILE VIEW (CARDS) ================= */}
          <div className="space-y-3 lg:hidden">
            {positions.map((p, i) => (
              <div
                key={i}
                className="border dark:border-gray-700
                           bg-gray-50 dark:bg-gray-700
                           rounded p-3 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm truncate max-w-[160px] text-gray-900 dark:text-gray-100">
                    {p.mint}
                  </span>

                  <span
                    className={`text-sm font-medium ${
                      Number(p.changePercent || 0) >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {p.changePercent}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <div>
                    <div className="text-gray-400 dark:text-gray-400">
                      Entry
                    </div>
                    {Number(p.entryPrice || 0).toFixed(6)}
                  </div>

                  <div>
                    <div className="text-gray-400 dark:text-gray-400">
                      Current
                    </div>
                    {Number(p.currentPrice || 0).toFixed(6)}
                  </div>

                  <div>
                    <div className="text-gray-400 dark:text-gray-400">
                      PnL
                    </div>
                    <span
                      className={
                        Number(p.pnlSol || 0) >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {Number(p.pnlSol || 0).toFixed(6)} SOL
                    </span>
                  </div>

                  <div>
                    <div className="text-gray-400 dark:text-gray-400">
                      TP Stage
                    </div>
                    {p.tpStage}
                  </div>
                </div>

                <button
                  onClick={() => manualSell(p.mint)}
                  className="mt-2 px-3 py-1 border dark:border-gray-600
                             bg-white dark:bg-gray-800
                             text-sm rounded
                             text-gray-900 dark:text-gray-100"
                >
                  Sell
                </button>
              </div>
            ))}
          </div>

          {/* ================= DESKTOP VIEW (TABLE) ================= */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-[700px] w-full text-sm">

              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">#</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">Token</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">Entry</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">Current</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">%</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">PnL</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">TP</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {positions.map((p, i) => (
                  <tr
                    key={i}
                    className="border-t dark:border-gray-700
                               hover:bg-gray-50 dark:hover:bg-gray-700/40
                               transition-colors"
                  >
                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {i + 1}
                    </td>

                    <td className="py-2 font-mono text-gray-900 dark:text-gray-100">
                      {p.mint}
                    </td>

                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {Number(p.entryPrice || 0).toFixed(6)}
                    </td>

                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {Number(p.currentPrice || 0).toFixed(6)}
                    </td>

                    <td
                      className={
                        Number(p.changePercent || 0) >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {p.changePercent}
                    </td>

                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {Number(p.pnlSol || 0).toFixed(6)}
                    </td>

                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {p.tpStage}
                    </td>

                    <td className="py-2">
                      <button
                        onClick={() => manualSell(p.mint)}
                        className="px-2 py-1 border dark:border-gray-600
                                   bg-white dark:bg-gray-800
                                   rounded text-gray-900 dark:text-gray-100"
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
