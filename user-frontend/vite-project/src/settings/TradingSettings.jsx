export default function TradingSettings({
  solPerTrade,
  setSolPerTrade,
  stopLoss,
  setStopLoss,
  trailingTrigger,
  setTrailingTrigger,
  trailingDistance,
  setTrailingDistance,
  tp1,
  setTp1,
  tp1Sell,
  setTp1Sell,
  tp2,
  setTp2,
  tp2Sell,
  setTp2Sell,
  tp3,
  setTp3,
  tp3Sell,
  setTp3Sell,
  saveSettings,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
      <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
        Trading Settings
      </h3>

      <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
        Default SOL per trade
      </label>
      <input
        type="number"
        className="border dark:border-gray-600
                   bg-white dark:bg-gray-700
                   text-gray-900 dark:text-gray-100
                   px-2 py-1 w-full mb-2 rounded"
        value={solPerTrade}
        onChange={(e) => setSolPerTrade(e.target.value)}
      />

      <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
        Stop Loss (%)
      </label>
      <input
        type="number"
        className="border dark:border-gray-600
                   bg-white dark:bg-gray-700
                   text-gray-900 dark:text-gray-100
                   px-2 py-1 w-full mb-3 rounded"
        value={stopLoss}
        onChange={(e) => setStopLoss(e.target.value)}
      />

      <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
        Trailing Trigger (%)
      </label>
      <input
        type="number"
        className="border dark:border-gray-600
                   bg-white dark:bg-gray-700
                   text-gray-900 dark:text-gray-100
                   px-2 py-1 w-full mb-3 rounded"
        value={trailingTrigger}
        onChange={(e) => setTrailingTrigger(e.target.value)}
      />

      <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
        Trailing Distance (%)
      </label>
      <input
        type="number"
        className="border dark:border-gray-600
                   bg-white dark:bg-gray-700
                   text-gray-900 dark:text-gray-100
                   px-2 py-1 w-full mb-3 rounded"
        value={trailingDistance}
        onChange={(e) => setTrailingDistance(e.target.value)}
      />

      <h4 className="font-medium mt-4 mb-2 text-gray-900 dark:text-gray-100">
        Take Profit Levels
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {[tp1, tp1Sell, tp2, tp2Sell, tp3, tp3Sell].map((val, i) => (
          <input
            key={i}
            type="number"
            className="border dark:border-gray-600
                       bg-white dark:bg-gray-700
                       text-gray-900 dark:text-gray-100
                       px-2 py-1 rounded"
            value={val}
            onChange={(e) => {
              const setters = [
                setTp1, setTp1Sell,
                setTp2, setTp2Sell,
                setTp3, setTp3Sell,
              ];
              setters[i](e.target.value);
            }}
          />
        ))}
      </div>

      <button
        onClick={saveSettings}
        className="mt-4 w-full py-2 rounded
                   bg-indigo-600 hover:bg-indigo-700
                   text-white transition"
      >
        Save Settings
      </button>
    </div>
  );
}
