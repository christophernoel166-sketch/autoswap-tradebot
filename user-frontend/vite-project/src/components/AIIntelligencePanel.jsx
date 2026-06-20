export default function AIIntelligencePanel({ ai }) {
  if (!ai) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-cyan-500/30 transition-all duration-500 ease-in-out">
      <h3 className="text-lg font-semibold text-cyan-300 mb-3">
        🧠 AI Intelligence
      </h3>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-400">Recommendation:</span>{" "}
          <span className="font-bold text-green-400">
           {typeof ai.recommendation === "string"
  ? ai.recommendation
  : ai.recommendation?.recommendation ?? "WATCH"}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Forecast Score:</span>{" "}
          <span className="text-white">
            {`${ai.forecast?.forecastScore ?? "--"} / 100`}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Pattern:</span>{" "}
          <span className="text-purple-300 break-all">
            {ai.signalScore?.patternKey ?? "N/A"}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Historical Win Rate:</span>{" "}
          <span className="text-green-400">
            {ai.signalScore?.historicalWinRate ?? 0}%
          </span>
        </div>

        <div>
          <span className="text-gray-400">Samples:</span>{" "}
          <span className="text-white">
            {ai.signalScore?.historicalSamples ?? 0}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Confidence:</span>{" "}
          <span className="text-cyan-300">
            {`${ai.signalScore?.confidenceScore ?? 0}%`}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Adjusted Score:</span>{" "}
          <span className="text-yellow-300">
            {`${
  ai.signalScore?.adjustedForecastScore ??
  ai.forecast?.forecastScore ??
  "--"
} / 100`}
          </span>
        </div>

        <div className="pt-2 text-xs text-gray-500">
          This panel will disappear automatically after 40 seconds.
        </div>
      </div>
    </div>
  );
}