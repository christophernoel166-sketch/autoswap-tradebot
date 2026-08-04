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
console.log("AI DATA", ai);

console.log(
  "SCANNER SCORES",
  ai.scannerScores
);

console.log(
  "RECOMMENDATION",
  ai.recommendation
);

console.log(
  "RECOMMENDATION SCANNER SCORES",
  ai.recommendation?.scannerScores
);
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

const scores =
  ai.recommendation?.scannerScores ??
  ai.scannerScores ??
  {};

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

const consensus =
  ai.recommendation?.consensus ??
  ai.consensus ??
  0;

const trustScore =
  ai.recommendation?.trustScore ??
  ai.trustScore ??
  0;

// ===========================================
// Developer Intelligence
// ===========================================

const developerWallet =
  ai.developerWallet ??
  ai.signalScore?.developerWallet ??
  "Unknown";

const developerTrust =
  ai.developerTrustScore ??
  ai.signalScore?.developerTrustScore ??
  trustScore;

const developerVerdict =
  ai.signalScore?.developerVerdict ??
  "UNKNOWN";

const previousLaunches =
  ai.signalScore?.previousLaunches ??
  "--";

const successfulLaunches =
  ai.signalScore?.successfulLaunches ??
  "--";

const ruggedLaunches =
  ai.signalScore?.ruggedLaunches ??
  "--";

const blacklistStatus =
  ai.signalScore?.blacklisted
    ? "BLACKLISTED"
    : "CLEAN";

const positiveVotes =
  ai.recommendation?.positiveVotes ??
  ai.positiveVotes ??
  0;

const totalVotes =
  ai.recommendation?.scannerVotes
    ? Object.keys(ai.recommendation.scannerVotes).length
    : ai.scannerVotes
    ? Object.keys(ai.scannerVotes).length
    : 7;

const contradictions =
  ai.recommendation?.contradictions ??
  ai.contradictions ??
  [];

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

  {/* Top Row */}
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

  {/* Confidence Progress */}
  <div className="mt-4">

    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">

      <div
        className="h-full rounded-full bg-cyan-400 transition-all duration-500"
        style={{
          width: `${confidence}%`,
        }}
      />

    </div>

  </div>

  {/* Main Metrics */}
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

  <div className="rounded-lg bg-gray-800 p-2.5">
    <div className="text-xs text-gray-400">
      Consensus
    </div>
    <div className="mt-1 text-lg font-bold text-cyan-300">
      {consensus}%
    </div>
  </div>

  <div className="rounded-lg bg-gray-800 p-2.5">
    <div className="text-xs text-gray-400">
      Trust Score
    </div>
    <div className="mt-1 text-lg font-bold text-green-400">
      {trustScore}%
    </div>
  </div>

  <div className="rounded-lg bg-gray-800 p-2.5">
    <div className="text-xs text-gray-400">
      Agreement
    </div>
    <div className="mt-1 text-lg font-bold text-white">
      {positiveVotes} / {totalVotes}
    </div>
  </div>

</div>


{/* ===========================================
    HISTORICAL INTELLIGENCE
=========================================== */}

<div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">

  <div className="flex items-center justify-between">

    <div>

      <div className="text-sm text-gray-400">

        Historical Intelligence

      </div>

      <div className="mt-1 text-lg font-semibold text-purple-300">

        AI Memory Engine

      </div>

    </div>

    <div className="text-right">

      <div className="text-xs text-gray-400">

        Memory Confidence

      </div>

      <div className="text-2xl font-bold text-purple-300">

        {ai.signalScore?.memoryConfidence ?? "--"}%

      </div>

    </div>

  </div>

  <div className="mt-5 grid grid-cols-3 gap-3">

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Similar Tokens

      </div>

      <div className="mt-1 text-lg font-bold text-white">

        {ai.signalScore?.historicalSamples ?? "--"}

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Win Rate

      </div>

      <div className="mt-1 text-lg font-bold text-green-400">

        {ai.signalScore?.historicalWinRate ?? "--"}%

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Moonshot Rate

      </div>

      <div className="mt-1 text-lg font-bold text-cyan-300">

        {ai.signalScore?.moonshotRate ?? "--"}%

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Rug Rate

      </div>

      <div className="mt-1 text-lg font-bold text-red-400">

        {ai.signalScore?.rugRate ?? "--"}%

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Expected Peak

      </div>

      <div className="mt-1 text-lg font-bold text-green-400">

        {ai.signalScore?.expectedPeakReturn ?? "--"}%

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Expected ROI

      </div>

      <div className="mt-1 text-lg font-bold text-green-400">

        {ai.signalScore?.expectedROI ?? "--"}%

      </div>

    </div>

  </div>

</div>


{/* ===========================================
    DEVELOPER INTELLIGENCE
=========================================== */}

<div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

  <div className="flex items-center justify-between">

    <div>

      <div className="text-sm text-gray-400">

        Developer Intelligence

      </div>

      <div className="mt-1 text-lg font-semibold text-emerald-300">

        👨‍💻 Wallet Reputation Engine

      </div>

    </div>

    <div className="text-right">

      <div className="text-xs text-gray-400">

        Trust Score

      </div>

      <div className="text-2xl font-bold text-emerald-300">

        {developerTrust}%

      </div>

    </div>

  </div>

  <div className="mt-5 rounded-lg bg-gray-800 p-3">

    <div className="text-xs text-gray-400">

      Developer Wallet

    </div>

    <div className="mt-1 break-all font-mono text-sm text-white">

      {developerWallet}

    </div>

  </div>

  <div className="mt-4 grid grid-cols-2 gap-3">

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Previous Launches

      </div>

      <div className="mt-1 text-xl font-bold text-white">

        {previousLaunches}

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Successful Launches

      </div>

      <div className="mt-1 text-xl font-bold text-green-400">

        {successfulLaunches}

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Rugged Launches

      </div>

      <div className="mt-1 text-xl font-bold text-red-400">

        {ruggedLaunches}

      </div>

    </div>

    <div className="rounded-lg bg-gray-800 p-3">

      <div className="text-xs text-gray-400">

        Blacklist Status

      </div>

      <div
        className={`mt-1 text-lg font-bold ${
          blacklistStatus === "CLEAN"
            ? "text-green-400"
            : "text-red-400"
        }`}
      >

        {blacklistStatus}

      </div>

    </div>

  </div>

  <div className="mt-4 rounded-lg border border-emerald-500/20 bg-gray-900 p-3">

    <div className="text-xs text-gray-400">

      Overall Verdict

    </div>

    <div className="mt-1 text-xl font-bold text-emerald-300">

      {developerVerdict}

    </div>

  </div>

</div>


  {/* Scanner Consensus */}
  <div className="mt-5 border-t border-gray-700 pt-4">

    <div className="flex items-center justify-between">

      <div>

        <div className="text-sm text-gray-400">
          Scanner Consensus
        </div>

        <div className="mt-1 text-3xl font-bold text-cyan-300">
          {consensus}%
        </div>

      </div>

      <div className="text-right">

        <div className="text-sm text-gray-400">
          Agreement
        </div>

        <div className="text-2xl font-bold text-green-400">
          {positiveVotes}/{totalVotes}
        </div>

      </div>

    </div>

    <div className="mt-3">

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">

        <div
          className="h-full rounded-full bg-green-400 transition-all duration-500"
          style={{
            width: `${consensus}%`,
          }}
        />

      </div>

    </div>

    <div className="mt-4 grid grid-cols-2 gap-3">

      <div className="rounded-lg bg-gray-800 p-3">

        <div className="text-xs text-gray-400">
          Positive Scanners
        </div>

        <div className="mt-1 text-xl font-bold text-green-400">
          {positiveVotes}
        </div>

      </div>

      <div className="rounded-lg bg-gray-800 p-3">

        <div className="text-xs text-gray-400">
          Total Scanners
        </div>

        <div className="mt-1 text-xl font-bold text-cyan-300">
          {totalVotes}
        </div>

      </div>

    </div>

    {contradictions.length > 0 && (

      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">

        <div className="mb-2 font-semibold text-red-300">
          Scanner Conflicts
        </div>

        <ul className="list-disc list-inside space-y-1 text-sm text-red-200">

          {contradictions.map((item, index) => (

            <li key={index}>
              {item}
            </li>

          ))}

        </ul>

      </div>

    )}

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

      {/* ===========================================
    AI EXPLANATION
=========================================== */}

<div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

  {/* --------------------------------------- */}
  {/* AI REASONING */}
  {/* --------------------------------------- */}

  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">

    <h3 className="text-lg font-semibold text-white mb-4">

      🧠 AI Reasoning

    </h3>

    <ul className="space-y-3">

      {reasoning.map((reason, index) => (

        <li
          key={index}
          className="flex items-start gap-3 text-gray-300"
        >

          <span className="text-cyan-400 mt-1">

            •

          </span>

          <span>

            {reason}

          </span>

        </li>

      ))}

    </ul>

  </div>

  {/* --------------------------------------- */}
  {/* WHY AI CHOSE THIS TRADE */}
  {/* --------------------------------------- */}

  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">

    <h3 className="text-lg font-semibold text-white mb-4">

      💡 Why AI Chose This Trade

    </h3>

    <ul className="space-y-3 text-gray-300">

      <li className="flex gap-3">

        <span className="text-green-400">

          ✓

        </span>

        <span>

          Multiple scanners agreed on this opportunity.

        </span>

      </li>

      <li className="flex gap-3">

        <span className="text-green-400">

          ✓

        </span>

        <span>

          Historical pattern has produced similar winners.

        </span>

      </li>

      <li className="flex gap-3">

        <span className="text-green-400">

          ✓

        </span>

        <span>

          Liquidity profile supports healthier trading.

        </span>

      </li>

      <li className="flex gap-3">

        <span className="text-green-400">

          ✓

        </span>

        <span>

                    Wallet quality and holder distribution appear healthy.

        </span>

      </li>

      <li className="flex gap-3">

        <span className="text-green-400">

          ✓

        </span>

        <span>

          AI confidence exceeded the minimum trading threshold.

        </span>

      </li>

    </ul>

  </div>

</div>



</div>



</div>



);
}