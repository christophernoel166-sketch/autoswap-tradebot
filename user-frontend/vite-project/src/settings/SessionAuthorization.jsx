import React from "react";

export default function SessionAuthorization({
  sessionExpiryHours,
  setSessionExpiryHours,
}) {
  return (
    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 text-sm">
      <div className="font-medium text-gray-800 dark:text-gray-100 mb-2">
        Trading Authorization Expiry
      </div>

      <select
        value={sessionExpiryHours}
        onChange={(e) => setSessionExpiryHours(Number(e.target.value))}
        className="w-full p-2 rounded bg-white dark:bg-gray-800
                   border border-gray-300 dark:border-gray-600
                   text-gray-900 dark:text-gray-100"
      >
        <option value={1}>1 hour</option>
        <option value={6}>6 hours</option>
        <option value={24}>24 hours (recommended)</option>
        <option value={168}>7 days</option>
      </select>

      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        After expiry, Autoswap must be re-authorized.
      </p>
    </div>
  );
}
