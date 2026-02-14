import React, { useState } from "react";

const MIN_WITHDRAW_SOL = 0.02;

export default function WalletWithdrawModal({
  open,
  onClose,
  availableSol,
  onSubmit,
  loading,
}) {
  const [amount, setAmount] = useState("");

  if (!open) return null;

  const amountNum = Number(amount || 0);
  const insufficient = amountNum > availableSol;
  const belowMin = amountNum > 0 && amountNum < MIN_WITHDRAW_SOL;

  const disabled =
    loading ||
    !amountNum ||
    insufficient ||
    belowMin;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Withdraw SOL
        </h2>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Available balance:{" "}
          <span className="font-mono">
            {availableSol.toFixed(4)} SOL
          </span>
        </div>

        {/* Amount input */}
        <div className="mb-4">
          <label className="text-xs text-gray-500">
            Amount (SOL)
          </label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded border
                       bg-white dark:bg-gray-700
                       text-gray-900 dark:text-gray-100"
            placeholder="0.0"
          />
        </div>

        {/* Errors */}
        {belowMin && (
          <div className="text-xs text-red-600 mb-2">
            Minimum withdrawal is {MIN_WITHDRAW_SOL} SOL
          </div>
        )}

        {insufficient && (
          <div className="text-xs text-red-600 mb-2">
            Insufficient balance
          </div>
        )}

        {/* Actions */}
        <button
          disabled={disabled}
          onClick={() => onSubmit(amountNum)}
          className={`w-full py-2 rounded text-sm text-white
            ${
              disabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {loading ? "Processing..." : "Withdraw"}
        </button>

        {/* Safety note */}
        <div className="text-xs text-gray-500 mt-4 text-center">
          Withdrawals are sent back to your connected wallet.
        </div>
      </div>
    </div>
  );
}
