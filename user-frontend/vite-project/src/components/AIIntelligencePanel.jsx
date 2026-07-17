

export default function AIIntelligencePanel({ ai }) {
  if (!ai) return null;

 const recommendation =
  typeof ai.recommendation === "string"
    ? ai.recommendation
    : ai.recommendation?.recommendation ??
      "WATCH";

const recommendationLabel =
  recommendation.replaceAll("_", " ");

const recommendationColor =
  recommendation === "STRONG_BUY"
    ? "text-green-400"
    : recommendation === "BUY"
    ? "text-green-500"
    : recommendation === "CAUTION_BUY"
    ? "text-yellow-400"
    : recommendation === "WATCH"
    ? "text-blue-400"
    : "text-red-400";

  const explanation =
    Array.isArray(
      ai.recommendation?.explanation
    )
      ? ai.recommendation.explanation
      : [];

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-cyan-500/30 transition-all duration-500 ease-in-out">
      <h3 className="text-lg font-semibold text-cyan-300 mb-3">
        🧠 AI Intelligence
      </h3>

      <div className="space-y-2 text-sm">
        {/* Recommendation */}
        <div>
          <span className="text-gray-400">
            Recommendation:
          </span>{" "}
          <span
            className={`font-bold ${recommendationColor}`}
          >
            {recommendationLabel}
          </span>
        </div>

        {/* Forecast Score */}
        <div>
          <span className="text-gray-400">
            Forecast Score:
          </span>{" "}
          <span className="text-white">
            {`${ai.forecast?.forecastScore ?? "--"} / 100`}
          </span>
        </div>

        {/* Pattern */}
        <div>
          <span className="text-gray-400">
            Pattern:
          </span>{" "}
          <span className="text-purple-300 break-all">
            {ai.signalScore?.patternKey ??
              "N/A"}
          </span>
        </div>

        {/* Historical Win Rate */}
        <div>
          <span className="text-gray-400">
            Historical Win Rate:
          </span>{" "}
          <span className="text-green-400">
            {ai.signalScore?.historicalWinRate ??
              0}
            %
          </span>
        </div>

        {/* Samples */}
        <div>
          <span className="text-gray-400">
            Samples:
          </span>{" "}
          <span className="text-white">
            {ai.signalScore?.historicalSamples ??
              0}
          </span>
        </div>

        {/* Confidence */}
        <div>
          <span className="text-gray-400">
            Confidence:
          </span>{" "}
          <span className="text-cyan-300">
            {`${
              ai.recommendation?.confidence ??
              ai.signalScore
                ?.confidenceScore ??
              0
            }%`}
          </span>
        </div>

        {/* Adjusted Score */}
        <div>
          <span className="text-gray-400">
            Adjusted Score:
          </span>{" "}
          <span className="text-yellow-300">
            {`${
              ai.signalScore
                ?.adjustedForecastScore ??
              ai.forecast
                ?.forecastScore ??
              "--"
            } / 100`}
          </span>
        </div>

        {/* AI Explanation */}
        {explanation.length > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <div className="text-gray-300 font-semibold mb-2">
              Why?
            </div>

            <ul className="list-disc list-inside space-y-1 text-gray-400">
              {explanation.map(
                (item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 text-xs text-gray-500">
          This panel will disappear
          automatically after 40 seconds.
        </div>
      </div>
    </div>
  );
}