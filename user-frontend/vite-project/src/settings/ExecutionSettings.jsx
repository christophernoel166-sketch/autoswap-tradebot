import React from "react";
import Toggle from "../ui/Toggle";

export default function ExecutionSettings({
  maxSlippagePercent,
  setMaxSlippagePercent,
  mevProtection,
  setMevProtection,
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        Execution Settings
      </h3>

      {/* 🔐 Slippage */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Max Slippage (%)
        </label>

        <input
          type="number"
          min={0.5}
          max={20}
          step={0.1}
          value={maxSlippagePercent}
          onChange={(e) =>
            setMaxSlippagePercent(
              Math.min(20, Math.max(0.5, Number(e.target.value)))
            )
          }
          className="w-full px-3 py-2 rounded border dark:bg-gray-900"
        />

        <p className="text-xs text-gray-500">
          Higher slippage increases fill probability but raises risk.
        </p>
      </div>

      {/* 🛡️ MEV Protection */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="font-medium text-sm">
            MEV Protection
          </p>
          <p className="text-xs text-gray-500">
            Uses private routing and priority fees
          </p>
        </div>

        <Toggle
          checked={mevProtection}
          onChange={setMevProtection}
        />
      </div>
    </div>
  );
}
