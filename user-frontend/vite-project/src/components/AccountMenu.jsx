import React, { useState } from "react";

export default function AccountMenu({
  walletAddress,
  selectedWallet,
  onSelectWallet,
  onDisconnect,
}) {
  const [open, setOpen] = useState(false);

  function copyAddr() {
    navigator.clipboard.writeText(walletAddress);
  }

  return (
    <div className="relative">
      {/* MENU BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 rounded bg-gray-200 text-sm hover:bg-gray-300"
      >
        {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg border z-50">
          <div className="px-3 py-2 text-xs text-gray-500 border-b">
            Wallet: {selectedWallet}
          </div>

          {/* COPY */}
          <button
            onClick={copyAddr}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
          >
            Copy Address
          </button>

          {/* SWITCH WALLET */}
          <div className="px-3 pt-1 pb-1 text-xs text-gray-500">Switch Wallet</div>

          {["phantom", "solflare", "backpack", "ledger"].map((w) => (
            <button
              key={w}
              onClick={() => onSelectWallet(w)}
              className={`w-full text-left px-3 py-1 hover:bg-gray-100 text-sm ${
                selectedWallet === w ? "text-indigo-600 font-medium" : ""
              }`}
            >
              {w.charAt(0).toUpperCase() + w.slice(1)}
            </button>
          ))}

          {/* DISCONNECT */}
          <button
            onClick={onDisconnect}
            className="w-full text-left px-3 py-2 hover:bg-red-100 text-sm text-red-600 border-t"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
