import React from "react";
import QRCode from "react-qr-code";

export default function DepositModal({
  open,
  onClose,
  depositAddress,
  memo,
}) {
  if (!open) return null;

  const qrValue = `solana:${depositAddress}?memo=${memo}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h3 className="text-lg font-semibold mb-4">
          Deposit SOL
        </h3>

        {/* QR */}
        <div className="flex justify-center mb-4 bg-white p-3 rounded">
          <QRCode value={qrValue} size={180} />
        </div>

        {/* Address */}
        <div className="mb-3">
          <label className="text-xs text-gray-500">
            Deposit Address
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={depositAddress}
              className="w-full text-xs p-2 rounded bg-gray-100 dark:bg-gray-700"
            />
            <button
              onClick={() => navigator.clipboard.writeText(depositAddress)}
              className="text-xs px-2 rounded bg-gray-200 dark:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Memo */}
        <div className="mb-4">
          <label className="text-xs text-gray-500">
            Memo (REQUIRED)
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={memo}
              className="w-full text-xs p-2 rounded bg-yellow-50 dark:bg-yellow-900"
            />
            <button
              onClick={() => navigator.clipboard.writeText(memo)}
              className="text-xs px-2 rounded bg-yellow-200 dark:bg-yellow-700"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="text-xs text-yellow-700 dark:text-yellow-400">
          ⚠️ Deposits without the correct memo will NOT be credited.
        </div>
      </div>
    </div>
  );
}
