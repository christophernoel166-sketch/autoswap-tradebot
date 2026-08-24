// src/components/AIDecisionCard.jsx

import React from "react";

/* ==========================================================
   HELPERS
========================================================== */

function getScoreColor(score) {
  const value = Number(score || 0);

  if (value >= 85) return "text-green-400";
  if (value >= 70) return "text-cyan-300";
  if (value >= 55) return "text-yellow-400";

  return "text-red-400";
}

function getRecommendationColor(recommendation) {
  switch (recommendation) {
    case "STRONG_BUY":
    case "BUY":
      return "text-green-400";

    case "CAUTION_BUY":
      return "text-yellow-400";

    case "WATCH":
      return "text-blue-400";

    case "HOLD":
      return "text-gray-300";

    case "SELL":
    case "STRONG_SELL":
    case "FULL_EXIT":
    case "CAUTION_SELL":
      return "text-red-400";

    default:
      return "text-yellow-400";
  }
}

function getRecommendationDescription(recommendation) {
  switch (recommendation) {
    case "STRONG_BUY":
      return "Strong opportunity detected. Multiple AI signals support an entry.";

    case "BUY":
      return "AI detects a favorable trading opportunity.";

    case "CAUTION_BUY":
      return "Potential opportunity with moderate risk. Monitor closely.";

    case "WATCH":
      return "Token is tradeable, but current conditions do not strongly support entry.";

    case "HOLD":
      return "Existing market conditions do not justify a new aggressive action.";

    case "CAUTION_SELL":
      return "Downside risk is increasing. Position should be monitored closely.";

    case "SELL":
      return "AI detects deteriorating conditions and recommends reducing exposure.";

    case "STRONG_SELL":
      return "Strong bearish conditions detected.";

    case "FULL_EXIT":
      return "AI recommends exiting the position because risk conditions have deteriorated.";

    default:
      return "AI has completed the token analysis.";
  }
}

function ScannerScore({ title, score }) {
  const value = Number(score || 0);

  return (
    <div className="rounded-lg bg-gray-900/80 border border-gray-700/60 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400">
          {title}
        </span>

        <span
          className={`text-sm font-bold ${getScoreColor(value)}`}
        >
          {value}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, value)
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  color = "text-white",
  subtitle,
}) {
  return (
    <div className="rounded-lg bg-gray-900/70 border border-gray-700/50 px-3 py-3">
      <div className="text-xs text-gray-400">
        {title}
      </div>

      <div
        className={`mt-1 text-lg font-bold ${color}`}
      >
        {value}
      </div>

      {subtitle && (
        <div className="mt-1 text-[11px] text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  value,
  valueColor = "text-white",
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-xs uppercase tracking-wide text-gray-400">
            {eyebrow}
          </div>
        )}

        <div className="mt-1 text-lg font-semibold text-white">
          {title}
        </div>
      </div>

      {value !== undefined && (
        <div className="text-right">
          <div className="text-[11px] text-gray-500">
            {eyebrow === "Historical Intelligence"
              ? "Memory Confidence"
              : "Trust Score"}
          </div>

          <div
            className={`text-xl font-bold ${valueColor}`}
          >
            {value}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function AIDecisionCard({ ai }) {
  if (!ai) {
    return null;
  }

  console.log("🧠 AI SCAN RESULT", ai);

  /* ========================================================
     RECOMMENDATION
  ======================================================== */

  const recommendation =
    typeof ai.recommendation === "string"
      ? ai.recommendation
      : ai.recommendation?.recommendation ??
        ai.recommendation?.action ??
        "WATCH";

  const recommendationLabel =
    String(recommendation)
      .replaceAll("_", " ")
      .toUpperCase();

  const recommendationColor =
    getRecommendationColor(
      recommendation
    );

  const recommendationDescription =
    getRecommendationDescription(
      recommendation
    );

  /* ========================================================
     CONFIDENCE
  ======================================================== */

  const rawConfidence =
    ai.confidence ??
    ai.signalScore?.confidenceScore ??
    ai.recommendation?.confidence ??
    0;

  const confidence = Math.max(
    0,
    Math.min(
      100,
      Number(rawConfidence || 0)
    )
  );

  /* ========================================================
     FORECAST / AI SCORE
  ======================================================== */

  const forecastScore = Number(
    ai.forecast?.forecastScore ??
      ai.signalScore?.forecastScore ??
      0
  );

  const adjustedScore = Number(
    ai.signalScore
      ?.adjustedForecastScore ??
      ai.signalScore?.aiScore ??
      forecastScore
  );

  /* ========================================================
     HISTORICAL INTELLIGENCE
  ======================================================== */

  const historicalWinRate =
    Number(
      ai.signalScore?.historicalWinRate ??
        ai.historical?.winRate ??
        0
    );

  const historicalSamples =
    Number(
      ai.signalScore?.historicalSamples ??
        ai.historical?.samples ??
        0
    );

  const memoryConfidence =
    ai.signalScore?.memoryConfidence ??
    ai.historical?.confidence ??
    "--";

  const moonshotRate =
    ai.signalScore?.moonshotRate ??
    ai.historical?.moonshotRate ??
    0;

  const rugRate =
    ai.signalScore?.rugRate ??
    ai.historical?.rugRate ??
    0;

  const expectedPeak =
    ai.signalScore?.expectedPeakReturn ??
    ai.historical?.expectedPeakReturn ??
    0;

  const expectedROI =
    ai.signalScore?.expectedROI ??
    ai.historical?.expectedROI ??
    0;

  /* ========================================================
     SCANNER SCORES
  ======================================================== */

  const scores =
    ai.recommendation?.scannerScores ??
    ai.scannerScores ??
    {};

  const momentumScore =
    Number(scores.momentum ?? 0);

  const volumeScore =
    Number(scores.volume ?? 0);

  const liquidityScore =
    Number(scores.liquidity ?? 0);

  const securityScore =
    Number(scores.security ?? 0);

  const walletScore =
    Number(scores.wallet ?? 0);

  const holderScore =
    Number(scores.holder ?? 0);

  const chartScore =
    Number(scores.chart ?? 0);

  /* ========================================================
     CONSENSUS
  ======================================================== */

  const consensus =
    Number(
      ai.recommendation?.consensus ??
        ai.consensus ??
        0
    );

  const trustScore =
    Number(
      ai.recommendation?.trustScore ??
        ai.trustScore ??
        0
    );

  const positiveVotes =
    Number(
      ai.recommendation?.positiveVotes ??
        ai.positiveVotes ??
        0
    );

  const totalVotes =
    ai.recommendation?.scannerVotes
      ? Object.keys(
          ai.recommendation.scannerVotes
        ).length
      : ai.scannerVotes
      ? Object.keys(
          ai.scannerVotes
        ).length
      : 7;

  /* ========================================================
     DEVELOPER INTELLIGENCE
  ======================================================== */

  const developerWallet =
    ai.developerWallet?.wallet ??
    ai.developer?.wallet ??
    ai.signalScore?.developerWallet ??
    "Unknown";

  const developerTrust =
    Number(
      ai.developerTrustScore ??
        ai.signalScore
          ?.developerTrustScore ??
        trustScore
    );

  const developerVerdict =
    ai.signalScore?.developerVerdict ??
    ai.developer?.verdict ??
    "UNKNOWN";

  const previousLaunches =
    Number(
      ai.developer?.tokensCreated ??
        ai.developer?.previousLaunches ??
        0
    );

  const successfulLaunches =
    Number(
      ai.developer?.successfulTokens ??
        ai.developer?.successfulLaunches ??
        0
    );

  const ruggedLaunches =
    Number(
      ai.developer?.rugs ??
        ai.developer?.ruggedTokens ??
        0
    );

  const blacklistStatus =
    ai.signalScore?.blacklisted
      ? "BLACKLISTED"
      : "CLEAN";

  /* ========================================================
     PATTERN INTELLIGENCE
  ======================================================== */

  const patternKey =
    ai.signalScore?.patternKey ??
    ai.pattern?.key ??
    "N/A";

  let patternQuality = "Unknown";

  if (
    historicalSamples >= 50 &&
    historicalWinRate >= 75
  ) {
    patternQuality = "Excellent";
  } else if (
    historicalSamples >= 25 &&
    historicalWinRate >= 60
  ) {
    patternQuality = "Good";
  } else if (
    historicalSamples >= 10
  ) {
    patternQuality = "Average";
  } else if (
    historicalSamples > 0
  ) {
    patternQuality = "Limited Data";
  }

  /* ========================================================
     REASONING
  ======================================================== */

  const reasoning =
    Array.isArray(
      ai.recommendation?.reasoning
    )
      ? ai.recommendation.reasoning
      : Array.isArray(ai.reasoning)
      ? ai.reasoning
      : [];

  const explanation =
    Array.isArray(
      ai.recommendation?.explanation
    )
      ? ai.recommendation.explanation
      : Array.isArray(ai.explanation)
      ? ai.explanation
      : [];

  const contradictions =
    Array.isArray(
      ai.recommendation?.contradictions
    )
      ? ai.recommendation.contradictions
      : Array.isArray(ai.contradictions)
      ? ai.contradictions
      : [];

/* ========================================================
   RENDER
======================================================== */

return (
  <div className="rounded-xl border border-cyan-500/20 bg-gray-900/70 overflow-hidden">

    {/* ====================================================
        COMPACT AI SCAN RESULT HEADER
    ==================================================== */}

    <div className="border-b border-gray-700/70 px-4 py-3">

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            <h3 className="text-lg font-semibold text-white">
              AI Scan Result
            </h3>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
              ● COMPLETED
            </span>

          </div>

          <div className="mt-0.5 text-xs text-gray-500">
            AI analysis of the scanned token
          </div>

        </div>

        <div className="text-right shrink-0">

          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            Confidence
          </div>

          <div className="text-2xl font-bold text-cyan-300">
            {confidence}%
          </div>

        </div>

      </div>

    </div>


    {/* ====================================================
        PRIMARY AI DECISION
    ==================================================== */}

    <div className="px-4 py-4">

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">

          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            AI Recommendation
          </div>

          <div
            className={`mt-0.5 text-3xl font-bold ${recommendationColor}`}
          >
            {recommendationLabel}
          </div>

          <div className="mt-1 text-sm text-gray-400">
            {recommendationDescription}
          </div>

        </div>


        {/* Compact confidence gauge */}

        <div className="relative h-16 w-16 shrink-0">

          <svg
            viewBox="0 0 100 100"
            className="h-full w-full -rotate-90"
          >

            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-gray-800"
            />

            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              className="text-cyan-400"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${
                2 *
                Math.PI *
                40 *
                (1 - confidence / 100)
              }`}
            />

          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-cyan-300">
              {confidence}%
            </span>
          </div>

        </div>

      </div>


      {/* Compact confidence bar */}

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">

        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-700"
          style={{
            width: `${confidence}%`,
          }}
        />

      </div>

    </div>


    {/* ====================================================
        PRIMARY METRICS
    ==================================================== */}

    <div className="grid grid-cols-2 gap-2 px-4 pb-4 md:grid-cols-3">

      <MetricCard
        title="Forecast"
        value={forecastScore}
        color="text-white"
      />

      <MetricCard
        title="AI Score"
        value={adjustedScore}
        color="text-cyan-300"
      />

      <MetricCard
        title="Pattern Win Rate"
        value={`${historicalWinRate}%`}
        color="text-green-400"
      />

      <MetricCard
        title="Consensus"
        value={`${consensus}%`}
        color="text-cyan-300"
      />

      <MetricCard
        title="Trust Score"
        value={`${trustScore}%`}
        color="text-green-400"
      />

      <MetricCard
        title="Agreement"
        value={`${positiveVotes} / ${totalVotes}`}
        color="text-white"
      />

    </div>


    {/* ====================================================
        ADVANCED AI INTELLIGENCE
        COLLAPSED BY DEFAULT
    ==================================================== */}

    <div className="border-t border-gray-700/60">

      {/* ==================================================
          HISTORICAL INTELLIGENCE
      ================================================== */}

      <details className="group">

        <summary className="cursor-pointer list-none px-4 py-3 hover:bg-gray-800/40">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                Historical Intelligence
              </div>

              <div className="mt-0.5 text-sm font-semibold text-purple-300">
                AI Memory Engine
              </div>

            </div>

            <div className="flex items-center gap-3">

              <span className="text-sm font-bold text-purple-300">
                {memoryConfidence === "--"
                  ? "--%"
                  : `${memoryConfidence}%`}
              </span>

              <span className="text-gray-500 group-open:rotate-180 transition-transform">
                ▼
              </span>

            </div>

          </div>

        </summary>


        <div className="px-4 pb-4">

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">

            <MetricCard
              title="Similar Tokens"
              value={historicalSamples || "--"}
              color="text-white"
            />

            <MetricCard
              title="Win Rate"
              value={`${historicalWinRate}%`}
              color="text-green-400"
            />

            <MetricCard
              title="Moonshot Rate"
              value={`${moonshotRate}%`}
              color="text-cyan-300"
            />

            <MetricCard
              title="Rug Rate"
              value={`${rugRate}%`}
              color="text-red-400"
            />

            <MetricCard
              title="Expected Peak"
              value={`${expectedPeak}%`}
              color="text-green-400"
            />

            <MetricCard
              title="Expected ROI"
              value={`${expectedROI}%`}
              color="text-green-400"
            />

          </div>

        </div>

      </details>


      {/* ==================================================
          DEVELOPER INTELLIGENCE
      ================================================== */}

      <details className="group border-t border-gray-700/60">

        <summary className="cursor-pointer list-none px-4 py-3 hover:bg-gray-800/40">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                Developer Intelligence
              </div>

              <div className="mt-0.5 text-sm font-semibold text-emerald-300">
                Wallet Reputation Engine
              </div>

            </div>

            <div className="flex items-center gap-3">

              <span className="text-sm font-bold text-emerald-300">
                {developerTrust}%
              </span>

              <span className="text-gray-500 group-open:rotate-180 transition-transform">
                ▼
              </span>

            </div>

          </div>

        </summary>


        <div className="px-4 pb-4">

          <div className="rounded-lg border border-gray-700/60 bg-gray-900/70 p-3">

            <div className="text-xs text-gray-400">
              Developer Wallet
            </div>

            <div className="mt-1 break-all font-mono text-xs text-white">
              {developerWallet}
            </div>

          </div>


          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">

            <MetricCard
              title="Previous Launches"
              value={previousLaunches}
              color="text-white"
            />

            <MetricCard
              title="Successful Launches"
              value={successfulLaunches}
              color="text-green-400"
            />

            <MetricCard
              title="Rugged Launches"
              value={ruggedLaunches}
              color="text-red-400"
            />

            <MetricCard
              title="Blacklist"
              value={blacklistStatus}
              color={
                blacklistStatus === "CLEAN"
                  ? "text-green-400"
                  : "text-red-400"
              }
            />

          </div>


          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-gray-900/70 p-3">

            <div className="text-xs text-gray-400">
              Overall Verdict
            </div>

            <div className="mt-1 text-sm font-bold text-emerald-300">
              {developerVerdict}
            </div>

          </div>

        </div>

      </details>


      {/* ==================================================
          SCANNER CONSENSUS
      ================================================== */}

      <details className="group border-t border-gray-700/60">

        <summary className="cursor-pointer list-none px-4 py-3 hover:bg-gray-800/40">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                Scanner Consensus
              </div>

              <div className="mt-0.5 text-sm font-semibold text-cyan-300">
                {consensus}% consensus
              </div>

            </div>

            <div className="flex items-center gap-3">

              <span className="text-sm font-bold text-green-400">
                {positiveVotes}/{totalVotes}
              </span>

              <span className="text-gray-500 group-open:rotate-180 transition-transform">
                ▼
              </span>

            </div>

          </div>

        </summary>


        <div className="px-4 pb-4">

          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">

            <div
              className="h-full rounded-full bg-green-400 transition-all duration-500"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, consensus)
                )}%`,
              }}
            />

          </div>


          {contradictions.length > 0 && (

            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">

              <div className="mb-2 text-sm font-semibold text-red-300">
                Scanner Conflicts
              </div>

              <ul className="space-y-1 text-xs text-red-200">

                {contradictions.map(
                  (item, index) => (
                    <li key={index}>
                      • {item}
                    </li>
                  )
                )}

              </ul>

            </div>

          )}

        </div>

      </details>


      {/* ==================================================
          SCANNER SCORES
      ================================================== */}

      <details className="group border-t border-gray-700/60">

        <summary className="cursor-pointer list-none px-4 py-3 hover:bg-gray-800/40">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                Scanner Scores
              </div>

              <div className="mt-0.5 text-sm font-semibold text-white">
                Momentum, Volume, Liquidity & Risk
              </div>

            </div>

            <span className="text-gray-500 group-open:rotate-180 transition-transform">
              ▼
            </span>

          </div>

        </summary>


        <div className="grid grid-cols-2 gap-2 px-4 pb-4 md:grid-cols-3">

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

      </details>


      {/* ==================================================
          PATTERN INTELLIGENCE
      ================================================== */}

      <details className="group border-t border-gray-700/60">

        <summary className="cursor-pointer list-none px-4 py-3 hover:bg-gray-800/40">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                Pattern Intelligence
              </div>

              <div className="mt-0.5 text-sm font-semibold text-purple-300">
                {patternQuality}
              </div>

            </div>

            <span className="text-gray-500 group-open:rotate-180 transition-transform">
              ▼
            </span>

          </div>

        </summary>


        <div className="px-4 pb-4">

          <div className="break-all font-mono text-xs text-purple-300">
            {patternKey}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">
              Win Rate {historicalWinRate}%
            </span>

            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300">
              {patternQuality}
            </span>

            <span className="rounded-full border border-gray-600 px-2.5 py-1 text-xs text-gray-300">
              {historicalSamples} Samples
            </span>

          </div>

        </div>

      </details>


      {/* ==================================================
          AI REASONING
      ================================================== */}

      {(reasoning.length > 0 || explanation.length > 0) && (

        <details className="group border-t border-gray-700/60">

          <summary className="cursor-pointer list-none px-4 py-3 hover:bg-gray-800/40">

            <div className="flex items-center justify-between">

              <div>

                <div className="text-[11px] uppercase tracking-wide text-gray-400">
                  AI Intelligence
                </div>

                <div className="mt-0.5 text-sm font-semibold text-cyan-300">
                  Reasoning & Decision Explanation
                </div>

              </div>

              <span className="text-gray-500 group-open:rotate-180 transition-transform">
                ▼
              </span>

            </div>

          </summary>


          <div className="grid grid-cols-1 gap-3 px-4 pb-4 lg:grid-cols-2">

            {/* AI Reasoning */}

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">

              <h3 className="mb-2 text-sm font-semibold text-white">
                🧠 AI Reasoning
              </h3>

              {reasoning.length > 0 ? (

                <ul className="space-y-1.5">

                  {reasoning.map(
                    (reason, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-xs text-gray-300"
                      >

                        <span className="mt-0.5 text-cyan-400">
                          •
                        </span>

                        <span>
                          {reason}
                        </span>

                      </li>
                    )
                  )}

                </ul>

              ) : (

                <div className="text-xs text-gray-500">
                  No detailed reasoning was supplied.
                </div>

              )}

            </div>


            {/* Why AI Chose This */}

            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">

              <h3 className="mb-2 text-sm font-semibold text-white">
                💡 Why AI Chose This
              </h3>

              {explanation.length > 0 ? (

                <ul className="space-y-1.5">

                  {explanation.map(
                    (item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-xs text-gray-300"
                      >

                        <span className="mt-0.5 text-green-400">
                          ✓
                        </span>

                        <span>
                          {item}
                        </span>

                      </li>
                    )
                  )}

                </ul>

              ) : (

                <ul className="space-y-1.5 text-xs text-gray-300">

                  <li className="flex gap-2">
                    <span className="text-green-400">
                      ✓
                    </span>

                    <span>
                      Scanner consensus: {consensus}%
                    </span>
                  </li>

                  <li className="flex gap-2">
                    <span className="text-green-400">
                      ✓
                    </span>

                    <span>
                      Historical pattern win rate: {historicalWinRate}%
                    </span>
                  </li>

                  <li className="flex gap-2">
                    <span className="text-green-400">
                      ✓
                    </span>

                    <span>
                      AI confidence: {confidence}%
                    </span>
                  </li>

                  <li className="flex gap-2">
                    <span className="text-green-400">
                      ✓
                    </span>

                    <span>
                      Developer trust: {developerTrust}%
                    </span>
                  </li>

                </ul>

              )}

            </div>

          </div>

        </details>

      )}

    </div>

  </div>
);
}