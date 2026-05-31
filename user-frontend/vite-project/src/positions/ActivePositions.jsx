export default function ActivePositions({
  positions,
  loading,
  fetchPositions,
  manualSell,
  manualSellAll,
}) {
  function handleSellPercent(mint, percent) {
    manualSell(mint, percent);
  }

  function formatNumber(value, decimals = 6) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }

  function shortMint(mint) {
    if (!mint) return "Unknown";
    return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
  }

  return (
    <div
      className="bg-white dark:bg-gray-800
                 p-4 rounded-xl shadow-sm mt-6 mb-10"
    >
      {/* ========================================= */}
      {/* HEADER */}
      {/* ========================================= */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Active Positions
        </h2>

        <div className="flex gap-2">
          <button
            onClick={fetchPositions}
            className="px-4 py-2 rounded-lg text-sm
                       border border-gray-300 dark:border-gray-700
                       bg-white dark:bg-gray-700
                       text-gray-900 dark:text-gray-100
                       hover:bg-gray-100 dark:hover:bg-gray-600
                       transition"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={manualSellAll}
            className="px-4 py-2 rounded-lg text-sm
                       bg-red-500 hover:bg-red-600
                       text-white transition"
          >
            Sell All
          </button>
        </div>
      </div>

      {/* ========================================= */}
      {/* EMPTY STATE */}
      {/* ========================================= */}
      {positions.length === 0 ? (
        <div
          className="text-center py-10
                     text-gray-500 dark:text-gray-400"
        >
          No active positions.
        </div>
      ) : (
        <>
          {/* ========================================= */}
          {/* MOBILE VIEW */}
          {/* ========================================= */}
          <div className="lg:hidden space-y-4">
            {positions.map((p, i) => {
              const tokenAmount = Number(
                p.tokenAmount || 0
              );

              const value =
                tokenAmount *
                Number(p.currentPrice || 0);

              return (
                <div
                  key={i}
                  className="rounded-xl p-4
                             border border-gray-200
                             dark:border-gray-700
                             bg-gray-50 dark:bg-gray-700"
                >
                  {/* TOP */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div
                        className="font-semibold
                                   text-gray-900
                                   dark:text-gray-100"
                      >
                        {shortMint(p.mint)}
                      </div>

                      <div
                        className="text-xs mt-1
                                   text-gray-500 dark:text-gray-400"
                      >
                        Qty: {formatNumber(tokenAmount, 4)}
                      </div>
                    </div>

                    <div
                      className={`text-sm font-semibold ${
                        Number(p.changePercent || 0) >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {Number(
                        p.changePercent || 0
                      ).toFixed(2)}
                      %
                    </div>
                  </div>

                  {/* STATS */}
                  <div
                    className="grid grid-cols-2 gap-3
                               text-sm"
                  >
                    <div>
                      <div className="text-gray-400">
                        Value
                      </div>

                      <div className="text-gray-900 dark:text-gray-100">
  ${formatNumber(value)}
</div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        Entry
                      </div>

                      <div className="text-gray-900 dark:text-gray-100">
                        {formatNumber(
                          p.entryPrice
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        Current
                      </div>

                      <div className="text-gray-900 dark:text-gray-100">
                        {formatNumber(
                          p.currentPrice
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        PnL
                      </div>

                      <div
                        className={
                          Number(p.pnlSol || 0) >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {formatNumber(
                          p.pnlSol
                        )}{" "}
                        SOL
                      </div>
                    </div>
                  </div>

                  {/* BUTTONS */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[25, 50, 75, 100].map(
                      (percent) => (
                        <button
                          key={percent}
                          onClick={() =>
                            handleSellPercent(
                              p.mint,
                              percent
                            )
                          }
                          className="py-2 rounded-lg text-xs
                                     border border-gray-300
                                     dark:border-gray-600
                                     bg-white dark:bg-gray-800
                                     text-gray-900 dark:text-gray-100
                                     hover:bg-gray-100
                                     dark:hover:bg-gray-700
                                     transition"
                        >
                          {percent === 100
                            ? "All"
                            : `${percent}%`}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================= */}
          {/* DESKTOP VIEW */}
          {/* ========================================= */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b
                             dark:border-gray-700"
                >
                  <th className="text-left py-3 text-gray-400">
                    Token
                  </th>

                  <th className="text-left py-3 text-gray-400">
                    Qty
                  </th>

                  <th className="text-left py-3 text-gray-400">
                    Value
                  </th>

                  <th className="text-left py-3 text-gray-400">
                    Entry
                  </th>

                  <th className="text-left py-3 text-gray-400">
                    Current
                  </th>

                  <th className="text-left py-3 text-gray-400">
                    %
                  </th>

                  <th className="text-left py-3 text-gray-400">
                    PnL
                  </th>

                  <th className="text-left py-3 text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {positions.map((p, i) => {
                  const tokenAmount = Number(
                    p.tokenAmount || 0
                  );

                  const value =
                    tokenAmount *
                    Number(p.currentPrice || 0);

                  return (
                    <tr
                      key={i}
                      className="border-b
                                 dark:border-gray-700
                                 hover:bg-gray-50
                                 dark:hover:bg-gray-700/30
                                 transition"
                    >
                      {/* TOKEN */}
                      <td className="py-4">
                        <div
                          className="font-medium
                                     text-gray-900
                                     dark:text-gray-100"
                        >
                          {shortMint(p.mint)}
                        </div>

                        <div
                          className="text-xs
                                     text-gray-500
                                     dark:text-gray-400"
                        >
                          TP Stage: {p.tpStage}
                        </div>
                      </td>

                      {/* QTY */}
                      <td className="py-4 text-gray-900 dark:text-gray-100">
                        {formatNumber(tokenAmount, 4)}
                      </td>

                      {/* VALUE */}
                      <td className="py-4 text-gray-900 dark:text-gray-100">
  ${formatNumber(value)}
</td>

                      {/* ENTRY */}
                      <td className="py-4 text-gray-900 dark:text-gray-100">
                        {formatNumber(p.entryPrice)}
                      </td>

                      {/* CURRENT */}
                      <td className="py-4 text-gray-900 dark:text-gray-100">
                        {formatNumber(p.currentPrice)}
                      </td>

                      {/* CHANGE */}
                      <td
                        className={`py-4 font-medium ${
                          Number(p.changePercent || 0) >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {Number(
                          p.changePercent || 0
                        ).toFixed(2)}
                        %
                      </td>

                      {/* PNL */}
                      <td
                        className={`py-4 font-medium ${
                          Number(p.pnlSol || 0) >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {formatNumber(p.pnlSol)} SOL
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4">
                        <div className="flex gap-2">
                          {[25, 50, 75, 100].map(
                            (percent) => (
                              <button
                                key={percent}
                                onClick={() =>
                                  handleSellPercent(
                                    p.mint,
                                    percent
                                  )
                                }
                                className="px-3 py-1.5
                                           rounded-lg text-xs
                                           border border-gray-300
                                           dark:border-gray-600
                                           bg-white dark:bg-gray-800
                                           text-gray-900 dark:text-gray-100
                                           hover:bg-gray-100
                                           dark:hover:bg-gray-700
                                           transition"
                              >
                                {percent === 100
                                  ? "All"
                                  : `${percent}%`}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}