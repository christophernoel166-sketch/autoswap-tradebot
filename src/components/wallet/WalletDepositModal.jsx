import React from "react";

export default function WalletDepositModal({
  open,
  onClose,
  internalWallet,
  userWallet,
  maxDepositSol = 50,
}) {
  if (!open) return null;

  const memo = `DEPOSIT:${userWallet}`;

  function copy(text) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Deposit SOL
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Send SOL to the address below. Funds will be credited automatically.
        </p>

        {/* Address */}
        <div className="mb-4">
          <label className="text-xs text-gray-500">Deposit Address</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded font-mono text-xs break-all">
              {internalWallet}
            </div>
            <button
              onClick={() => copy(internalWallet)}
              className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Memo */}
        <div className="mb-4">
          <label className="text-xs text-gray-500">Required Memo</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded font-mono text-xs break-all">
              {memo}
            </div>
            <button
              onClick={() => copy(memo)}
              className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Warnings */}
        <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 rounded p-3 space-y-1">
          <div>⚠️ Send SOL only (no tokens)</div>
          <div>⚠️ Memo is required or deposit will be ignored</div>
          <div>⚠️ Maximum deposit: {maxDepositSol} SOL</div>
        </div>
      </div>
    </div>
  );
}
