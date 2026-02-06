import React from "react";

export default function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
      <span className="text-sm text-gray-800 dark:text-gray-100">
        {label}
      </span>

      <button
        onClick={() => onChange(!checked)}
        className={`px-3 py-1 text-xs rounded transition ${
          checked
            ? "bg-green-600 text-white"
            : "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </div>
  );
}
