function getScoreColor(score) {
  if (score >= 85) return "text-green-400";

  if (score >= 70) return "text-cyan-300";

  if (score >= 55) return "text-yellow-400";

  return "text-red-400";
}


function ScannerScore({
  title,
  score,
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-900 p-2">

      <span className="text-sm text-gray-300">
        {title}
      </span>

      <span
        className={`font-bold ${getScoreColor(score)}`}
      >
        {score}
      </span>

    </div>
  );
}


export default function AIDecisionCard({ ai }) {
console.log("AI DATA:", ai);
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

  const explanation = Array.isArray(
    ai.recommendation?.explanation
  )
    ? ai.recommendation.explanation
    : [];

  const reasoning = Array.isArray(
    ai.recommendation?.reasoning
  )
    ? ai.recommendation.reasoning
    : [];

  const confidence =
    ai.confidence ??
    ai.signalScore?.confidenceScore ??
    0;

  const forecastScore =
    ai.forecast?.forecastScore ?? 0;

  const adjustedScore =
    ai.signalScore
      ?.adjustedForecastScore ??
    forecastScore;

  const historicalWinRate =
    ai.signalScore?.historicalWinRate ??
    0;

  const historicalSamples =
    ai.signalScore
      ?.historicalSamples ?? 0;

const scores = ai.scannerScores ?? {};

const momentumScore =
  scores.momentum ?? 0;

const volumeScore =
  scores.volume ?? 0;

const liquidityScore =
  scores.liquidity ?? 0;

const securityScore =
  scores.security ?? 0;

const walletScore =
  scores.wallet ?? 0;

const holderScore =
  scores.holder ?? 0;

const chartScore =
  scores.chart ?? 0;

  const patternKey =
    ai.signalScore?.patternKey ??
    "N/A";

  const winRateColor =
    historicalWinRate >= 80
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : historicalWinRate >= 60
      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
      : historicalWinRate >= 40
      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      : "bg-red-500/20 text-red-300 border-red-500/30";

  let patternQuality = "Unknown";
  let patternColor =
    "bg-gray-700 text-gray-300 border-gray-600";

  if (
    historicalSamples >= 50 &&
    historicalWinRate >= 75
  ) {
    patternQuality = "Excellent";
    patternColor =
      "bg-green-500/20 text-green-300 border-green-500/30";
  } else if (
    historicalSamples >= 25 &&
    historicalWinRate >= 60
  ) {
    patternQuality = "Good";
    patternColor =
      "bg-blue-500/20 text-blue-300 border-blue-500/30";
  } else if (
    historicalSamples >= 10
  ) {
    patternQuality = "Average";
    patternColor =
      "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  } else if (
    historicalSamples > 0
  ) {
    patternQuality = "Limited Data";
    patternColor =
      "bg-orange-500/20 text-orange-300 border-orange-500/30";
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-cyan-500/30 p-4 transition-all duration-500 ease-in-out">

      <h3 className="mb-4 text-lg font-semibold text-cyan-300">
        🧠 AI Intelligence
      </h3>

      <div className="space-y-5 text-sm">

      
<div className="rounded-xl border border-cyan-500/20 bg-gray-900 p-4">

  <div className="flex items-center justify-between">

    <div>

      <div className="text-sm text-gray-400">
        AI Recommendation
      </div>

      <div
        className={`mt-1 text-2xl font-bold ${recommendationColor}`}
      >
        {recommendationLabel}
      </div>

    </div>

    <div className="text-right">

      <div className="text-sm text-gray-400">
        Confidence
      </div>

      <div className="text-3xl font-bold text-cyan-300">
        {confidence}%
      </div>

    </div>

  </div>

  <div className="mt-3">

    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">

      <div
        className="h-full rounded-full bg-cyan-400 transition-all duration-500"
        style={{
          width: `${confidence}%`,
        }}
      />

    </div>

  </div>

  <div className="mt-3 grid grid-cols-3 gap-3">

    <div className="rounded-lg bg-gray-800 p-2.5">

      <div className="text-xs text-gray-400">
        Forecast
      </div>

      <div className="mt-1 text-lg font-bold text-white">
  {forecastScore}
</div>

    </div>

    <div className="rounded-lg bg-gray-800 p-2.5">

      <div className="text-xs text-gray-400">
        AI Score
      </div>

      <div className="mt-1 text-lg font-bold text-cyan-300">
        {adjustedScore}
      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-2.5">

      <div className="text-xs text-gray-400">
        Pattern Win Rate
      </div>

      <div className="mt-1 text-lg font-bold text-green-400">
        {historicalWinRate}%
      </div>

    </div>

  </div>

</div>
          

<div className="border-t border-gray-700 pt-4">

  <h4 className="mb-3 font-semibold text-gray-300">
    Scanner Scores
  </h4>

  <div className="grid grid-cols-3 gap-3">

    <ScannerScore
      title="Momentum"
      score={momentumScore}
    />

    <ScannerScore
      title="Volume"
      score={volumeScore}
    />

    <ScannerScore
      title="Liquidity"
      score={liquidityScore}
    />

    <ScannerScore
      title="Security"
      score={securityScore}
    />

    <ScannerScore
      title="Wallet"
      score={walletScore}
    />

    <ScannerScore
      title="Holder"
      score={holderScore}
    />

    <ScannerScore
      title="Chart"
      score={chartScore}
    />

  </div>

</div>


        {/* Pattern Intelligence */}
        <div className="space-y-3">

          <div>

            <div className="mb-1 text-xs text-gray-400">
              Pattern
            </div>

            <div className="break-all font-mono text-xs text-purple-300">
              {patternKey}
            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${winRateColor}`}
            >
              Win Rate {historicalWinRate}%
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${patternColor}`}
            >
              {patternQuality}
            </span>

            <span className="rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300">
              {historicalSamples} Samples
            </span>

          </div>

        </div>

        {/* AI Reasoning */}
        {reasoning.length > 0 && (
          <div className="border-t border-gray-700 pt-4">

            <h4 className="mb-2 font-semibold text-gray-300">
              AI Reasoning
            </h4>

            <ul className="list-disc list-inside space-y-1 text-gray-400">
              {reasoning.map((item, index) => (
                <li key={index}>
                  {item}
                </li>
              ))}
            </ul>

          </div>
        )}

        {/* AI Explanation */}
        {explanation.length > 0 && (
          <div className="border-t border-gray-700 pt-4">

            <h4 className="mb-2 font-semibold text-gray-300">
              Why?
            </h4>

            <ul className="list-disc list-inside space-y-1 text-gray-400">
              {explanation.map((item, index) => (
                <li key={index}>
                  {item}
                </li>
              ))}
            </ul>

          </div>
        )}

        

      </div>

    </div>
  );
}