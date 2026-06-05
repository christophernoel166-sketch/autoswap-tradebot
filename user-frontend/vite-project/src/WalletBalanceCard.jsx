import React from "react";

export default function WalletBalanceCard({
  availableSol = 0,
  availableUsd = 0,
positionsUsd = 0,
  portfolioUsd = 0,
  lockedSol = 0,
  onDeposit,
  onWithdraw,
  withdrawDisabled = true,
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100">
        Wallet Balance
      </h3>
<div className="space-y-1 text-sm">
  <div className="flex justify-between">
    <span className="text-gray-600 dark:text-gray-400">
      Available
    </span>

    <div className="text-right">
      <div className="font-mono text-gray-900 dark:text-gray-100">
        {Number(availableSol).toFixed(6)} SOL
      </div>

      <div className="text-xs text-green-600 dark:text-green-400">
        ${Number(availableUsd).toFixed(2)}
      </div>
    </div>
  </div>

  {/* OPEN POSITIONS VALUE */}
  <div className="flex justify-between">
    <span className="text-gray-600 dark:text-gray-400">
      Open Positions
    </span>

    <span className="font-mono text-green-600 dark:text-green-400">
      ${Number(positionsUsd).toFixed(2)}
    </span>
  </div>

  {/* TOTAL PORTFOLIO */}
  <div className="flex justify-between border-t pt-1 mt-1">
    <span className="font-semibold text-gray-700 dark:text-gray-300">
      Total Portfolio
    </span>

    <span className="font-mono font-semibold text-green-600 dark:text-green-400">
      ${Number(portfolioUsd).toFixed(2)}
    </span>
  </div>

  <div className="flex justify-between">
    <span className="text-gray-600 dark:text-gray-400">
      Locked
    </span>
          <span className="font-mono text-gray-900 dark:text-gray-100">
            {Number(lockedSol).toFixed(6)} SOL
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onDeposit}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded"
        >
          ➕ Deposit SOL
        </button>

        <button
          onClick={onWithdraw}
          disabled={withdrawDisabled}
          className={`flex-1 text-sm py-2 rounded ${
            withdrawDisabled
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          ⬇ Withdraw
        </button>
      </div>
    </div>
  );
}
