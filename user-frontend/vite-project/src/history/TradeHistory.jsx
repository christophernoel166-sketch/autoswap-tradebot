// user-frontend/vite-project/src/history.TradeHistory.jsx

export default function TradeHistory({ filteredHistory }) {
  const solscanTxUrl = (sig) =>
    sig ? `https://solscan.io/tx/${sig}` : null;

  const formatPct = (value) => {
    if (!Number.isFinite(value)) return "0.00%";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm mt-6">
      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Trade History
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredHistory.length} records
        </span>
      </div>

      {/* EMPTY STATE */}
      {filteredHistory.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No trades found.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="min-w-[900px] w-full text-sm">
            {/* TABLE HEAD */}
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">
                  Time
                </th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">
                  Token
                </th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">
                  Entry
                </th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">
                  Exit
                </th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">
                  PnL
                </th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">
                  Tx
                </th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody>
              {filteredHistory.map((h, i) => {
                const entry = Number(h.entryPrice || 0);
                const exit = Number(h.exitPrice || 0);

                // ✅ Percent PnL based on price change
                const pct =
                  entry > 0 ? ((exit - entry) / entry) * 100 : 0;

                const buySig = h.buyTxid || null;
                const sellSig = h.sellTxid || null;

                const buyUrl = solscanTxUrl(buySig);
                const sellUrl = solscanTxUrl(sellSig);

                return (
                  <tr
                    key={i}
                    className="border-t dark:border-gray-700
                               hover:bg-gray-50 dark:hover:bg-gray-700/40
                               transition-colors"
                  >
                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {String(h.createdAt || "").slice(0, 19)}
                    </td>

                    <td className="py-2 font-mono text-gray-900 dark:text-gray-100">
                      {h.tokenMint || h.mint}
                    </td>

                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {entry.toFixed(6)}
                    </td>

                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {exit.toFixed(6)}
                    </td>

                    <td
                      className={`py-2 font-medium ${
                        pct >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatPct(pct)}
                    </td>

                    {/* ✅ Clean Tx column: [B] [S] */}
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={buyUrl || undefined}
                          target="_blank"
                          rel="noreferrer"
                          title={buySig ? "View BUY on Solscan" : "No BUY tx"}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold border
                            ${
                              buyUrl
                                ? "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                : "text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60"
                            }`}
                          onClick={(e) => {
                            if (!buyUrl) e.preventDefault();
                          }}
                        >
                          B
                        </a>

                        <a
                          href={sellUrl || undefined}
                          target="_blank"
                          rel="noreferrer"
                          title={sellSig ? "View SELL on Solscan" : "No SELL tx"}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold border
                            ${
                              sellUrl
                                ? "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                : "text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60"
                            }`}
                          onClick={(e) => {
                            if (!sellUrl) e.preventDefault();
                          }}
                        >
                          S
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}