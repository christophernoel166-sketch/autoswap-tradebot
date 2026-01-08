export default function TradeHistory({ filteredHistory }) {
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
                <th className="hidden lg:table-cell text-left py-2 text-gray-600 dark:text-gray-400">
                  Buy Tx
                </th>
                <th className="hidden lg:table-cell text-left py-2 text-gray-600 dark:text-gray-400">
                  Sell Tx
                </th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody>
              {filteredHistory.map((h, i) => {
                const pnl =
                  (Number(h.exitPrice || 0) - Number(h.entryPrice || 0)) *
                  Number(h.amountSol || h.solAmount || 0);

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
                      {Number(h.entryPrice || 0).toFixed(6)}
                    </td>

                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {Number(h.exitPrice || 0).toFixed(6)}
                    </td>

                    <td
                      className={`py-2 font-medium ${
                        pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {pnl.toFixed(6)}
                    </td>

                    <td className="hidden lg:table-cell py-2 break-all max-w-[220px] text-gray-500 dark:text-gray-400">
                      {h.buyTxid || "-"}
                    </td>

                    <td className="hidden lg:table-cell py-2 break-all max-w-[220px] text-gray-500 dark:text-gray-400">
                      {h.sellTxid || "-"}
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
