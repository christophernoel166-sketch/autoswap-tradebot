import React from "react";
import QRCode from "react-qr-code";

export default function DepositModal({
  open,
  onClose,
  depositAddress,
}) {
  if (!open) return null;

  // Phantom-compatible SOL QR (no memo)
  const qrValue = `solana:${depositAddress}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>

        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Deposit SOL
        </h3>

        {/* QR Code */}
        <div className="flex justify-center mb-4 bg-white p-3 rounded">
          <QRCode value={qrValue} size={180} />
        </div>

        {/* Deposit Address */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 dark:text-gray-400">
            Deposit Address
          </label>
          <div className="flex gap-2 mt-1">
            <input
              readOnly
              value={depositAddress}
              className="w-full text-xs p-2 rounded bg-gray-100 dark:bg-gray-700
                         text-gray-900 dark:text-gray-100 font-mono"
            />
            <button
              onClick={() => navigator.clipboard.writeText(depositAddress)}
              className="text-xs px-3 rounded bg-gray-200 dark:bg-gray-600
                         text-gray-800 dark:text-gray-100"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Send SOL to this address from your Phantom wallet.  
          Deposits are credited automatically.
        </div>
      </div>
    </div>
  );
}
