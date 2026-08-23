import { useState } from "react";
import { FiCopy } from "react-icons/fi";

export default function ActivePositions({
  positions,
  loading,
  fetchPositions,
  manualSell,
  manualSellAll,
}) {
  const [copiedMint, setCopiedMint] = useState(null);

  // =====================================================
  // HELPERS
  // =====================================================

  function handleSellPercent(mint, percent) {
    manualSell(mint, percent);
  }

  function formatNumber(value, decimals = 6) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }

  function shortMint(mint) {
    if (!mint) return "Unknown";

    return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
  }

  function getChangeClass(value) {
    return Number(value || 0) >= 0
      ? "text-green-500"
      : "text-red-500";
  }

  function getRecommendationClass(recommendation) {
    const value =
      String(recommendation || "")
        .toUpperCase()
        .replace("_", " ");

    if (
      value.includes("FULL EXIT") ||
      value.includes("SELL")
    ) {
      return "text-red-500";
    }

    if (
      value.includes("BUY") ||
      value.includes("STRONG BUY")
    ) {
      return "text-green-500";
    }

    if (
      value.includes("WATCH") ||
      value.includes("HOLD")
    ) {
      return "text-yellow-500";
    }

    return "text-gray-900 dark:text-gray-100";
  }

  function getHealthClass(health) {
    const value =
      String(health || "").toUpperCase();

    if (
      value.includes("CRITICAL") ||
      value.includes("DANGER")
    ) {
      return "text-red-500";
    }

    if (
      value.includes("WARNING") ||
      value.includes("WEAK")
    ) {
      return "text-yellow-500";
    }

    if (
      value.includes("HEALTHY") ||
      value.includes("STRONG")
    ) {
      return "text-green-500";
    }

    return "text-gray-500 dark:text-gray-400";
  }

  function getProtectionClass(protection) {
    const value =
      String(protection || "").toUpperCase();

    if (
      value.includes("HIGH") ||
      value.includes("STRONG")
    ) {
      return "text-green-500";
    }

    if (
      value.includes("MODERATE") ||
      value.includes("MEDIUM")
    ) {
      return "text-yellow-500";
    }

    if (
      value.includes("LOW") ||
      value.includes("NONE")
    ) {
      return "text-gray-500 dark:text-gray-400";
    }

    return "text-gray-900 dark:text-gray-100";
  }

  function getConfidenceClass(confidence) {
    const value = Number(confidence || 0);

    if (value >= 80) {
      return "text-green-500";
    }

    if (value >= 60) {
      return "text-yellow-500";
    }

    if (value > 0) {
      return "text-orange-500";
    }

    return "text-gray-500 dark:text-gray-400";
  }

  function copyMint(mint) {
    if (!mint) return;

    navigator.clipboard.writeText(mint);

    setCopiedMint(mint);

    setTimeout(() => {
      setCopiedMint(null);
    }, 2000);
  }

  // =====================================================
  // AI POSITION PANEL
  // =====================================================

  function AIPositionIntelligence({ position }) {
    const confidence =
      Number(position.aiConfidence || 0);

    const recommendation =
      position.aiRecommendation || "HOLD";

    const action =
      position.aiAction || "HOLD";

    const health =
      position.aiHealth || "UNKNOWN";

    const task =
      position.aiTask || "Monitoring";

    const trend =
      position.aiTrend || "UNKNOWN";

    const protection =
      position.aiProtection || "NONE";

    const status =
      position.aiStatus || "IDLE";

    return (
      <div
        className="
          mt-5
          rounded-xl
          border
          border-cyan-200
          dark:border-cyan-900
          bg-cyan-50/60
          dark:bg-cyan-950/20
          p-4
        "
      >
        {/* ================================================= */}
        {/* AI HEADER */}
        {/* ================================================= */}

        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div
              className="
                text-sm
                font-semibold
                text-gray-900
                dark:text-gray-100
              "
            >
              🤖 AI Position Intelligence
            </div>

            <div
              className="
                text-xs
                text-gray-500
                dark:text-gray-400
                mt-1
              "
            >
              Live AI state for this position
            </div>
          </div>

          <div
            className="
              px-2.5
              py-1
              rounded-full
              text-xs
              font-medium
              bg-white
              dark:bg-gray-800
              border
              border-gray-200
              dark:border-gray-700
              text-gray-700
              dark:text-gray-300
            "
          >
            {status}
          </div>
        </div>

        {/* ================================================= */}
        {/* PRIMARY AI DECISION */}
        {/* ================================================= */}

        <div
          className="
            rounded-xl
            bg-white
            dark:bg-gray-800
            border
            border-gray-200
            dark:border-gray-700
            p-4
            mb-4
          "
        >
          <div
            className="
              text-xs
              uppercase
              tracking-wide
              text-gray-500
              dark:text-gray-400
              mb-1
            "
          >
            AI Recommendation
          </div>

          <div
            className={`
              text-2xl
              font-bold
              ${getRecommendationClass(recommendation)}
            `}
          >
            {String(recommendation)
              .replace(/_/g, " ")}
          </div>

          <div
            className="
              text-xs
              text-gray-500
              dark:text-gray-400
              mt-1
            "
          >
            Current AI decision for this position
          </div>
        </div>

        {/* ================================================= */}
        {/* AI METRICS */}
        {/* ================================================= */}

        <div
          className="
            grid
            grid-cols-2
            md:grid-cols-4
            gap-3
          "
        >
          {/* CONFIDENCE */}

          <div
            className="
              rounded-lg
              bg-white
              dark:bg-gray-800
              border
              border-gray-200
              dark:border-gray-700
              p-3
            "
          >
            <div
              className="
                text-xs
                text-gray-500
                dark:text-gray-400
              "
            >
              Confidence
            </div>

            <div
              className={`
                text-lg
                font-bold
                mt-1
                ${getConfidenceClass(confidence)}
              `}
            >
              {confidence}%
            </div>
          </div>

          {/* HEALTH */}

          <div
            className="
              rounded-lg
              bg-white
              dark:bg-gray-800
              border
              border-gray-200
              dark:border-gray-700
              p-3
            "
          >
            <div
              className="
                text-xs
                text-gray-500
                dark:text-gray-400
              "
            >
              Health
            </div>

            <div
              className={`
                text-sm
                font-semibold
                mt-1
                ${getHealthClass(health)}
              `}
            >
              {String(health).replace(/_/g, " ")}
            </div>
          </div>

          {/* ACTION */}

          <div
            className="
              rounded-lg
              bg-white
              dark:bg-gray-800
              border
              border-gray-200
              dark:border-gray-700
              p-3
            "
          >
            <div
              className="
                text-xs
                text-gray-500
                dark:text-gray-400
              "
            >
              AI Action
            </div>

            <div
              className="
                text-sm
                font-semibold
                text-gray-900
                dark:text-gray-100
                mt-1
              "
            >
              {String(action).replace(/_/g, " ")}
            </div>
          </div>

          {/* TREND */}

          <div
            className="
              rounded-lg
              bg-white
              dark:bg-gray-800
              border
              border-gray-200
              dark:border-gray-700
              p-3
            "
          >
            <div
              className="
                text-xs
                text-gray-500
                dark:text-gray-400
              "
            >
              Trend
            </div>

            <div
              className="
                text-sm
                font-semibold
                text-gray-900
                dark:text-gray-100
                mt-1
              "
            >
              {String(trend).replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* PROTECTION */}
        {/* ================================================= */}

        <div
          className="
            mt-3
            rounded-lg
            bg-white
            dark:bg-gray-800
            border
            border-gray-200
            dark:border-gray-700
            p-3
          "
        >
          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-3
            "
          >
            <div>
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                🛡 AI Protection
              </div>

              <div
                className={`
                  text-sm
                  font-semibold
                  mt-1
                  ${getProtectionClass(protection)}
                `}
              >
                {String(protection).replace(/_/g, " ")}
              </div>
            </div>

            <div>
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Current AI Task
              </div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-gray-900
                  dark:text-gray-100
                  mt-1
                "
              >
                {String(task).replace(/_/g, " ")}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // POSITION CARD
  // =====================================================

  function PositionCard({ position, index }) {
    const tokenAmount =
      Number(position.tokenAmount || 0);

    const value =
      tokenAmount *
      Number(position.currentPrice || 0);

    const changePercent =
      Number(position.changePercent || 0);

    const pnlSol =
      Number(position.pnlSol || 0);

    const confidence =
      Number(position.aiConfidence || 0);

    const recommendation =
      position.aiRecommendation || "HOLD";

    return (
      <div
        key={index}
        className="
          rounded-2xl
          border
          border-gray-200
          dark:border-gray-700
          bg-white
          dark:bg-gray-800
          shadow-sm
          overflow-hidden
        "
      >
        {/* ================================================= */}
        {/* POSITION HEADER */}
        {/* ================================================= */}

        <div
          className="
            p-4
            border-b
            border-gray-200
            dark:border-gray-700
          "
        >
          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:items-start
              sm:justify-between
              gap-3
            "
          >
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="
                    font-semibold
                    text-lg
                    text-gray-900
                    dark:text-gray-100
                  "
                >
                  {shortMint(position.mint)}
                </div>

                <button
                  onClick={() =>
                    copyMint(position.mint)
                  }
                  className="
                    text-gray-400
                    hover:text-blue-500
                    transition
                  "
                  title="Copy contract address"
                >
                  <FiCopy size={15} />
                </button>

                {copiedMint === position.mint && (
                  <span
                    className="
                      text-xs
                      text-green-500
                    "
                  >
                    Copied
                  </span>
                )}
              </div>

              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                  mt-1
                "
              >
                TP Stage:{" "}
                {Number(position.tpStage || 0)}
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  px-2.5
                  py-1
                  rounded-full
                  text-xs
                  font-semibold
                  bg-green-100
                  dark:bg-green-950/30
                  text-green-600
                  dark:text-green-400
                "
              >
                ●{" "}
                {String(
                  position.status || "open"
                ).toUpperCase()}
              </span>

              {recommendation !== "HOLD" && (
                <span
                  className="
                    px-2.5
                    py-1
                    rounded-full
                    text-xs
                    font-semibold
                    bg-gray-100
                    dark:bg-gray-700
                    text-gray-700
                    dark:text-gray-200
                  "
                >
                  AI
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* POSITION PERFORMANCE */}
        {/* ================================================= */}

        <div className="p-4">
          <div
            className="
              text-xs
              uppercase
              tracking-wide
              text-gray-400
              mb-3
            "
          >
            Position Performance
          </div>

          <div
            className="
              grid
              grid-cols-2
              sm:grid-cols-4
              gap-4
            "
          >
            {/* QUANTITY */}

            <div>
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Quantity
              </div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-gray-900
                  dark:text-gray-100
                  mt-1
                "
              >
                {formatNumber(
                  tokenAmount,
                  4
                )}
              </div>
            </div>

            {/* VALUE */}

            <div>
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Value
              </div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-gray-900
                  dark:text-gray-100
                  mt-1
                "
              >
                $
                {formatNumber(value)}
              </div>
            </div>

            {/* ENTRY */}

            <div>
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Entry
              </div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-gray-900
                  dark:text-gray-100
                  mt-1
                "
              >
                {formatNumber(
                  position.entryPrice
                )}
              </div>
            </div>

            {/* CURRENT */}

            <div>
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Current
              </div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-gray-900
                  dark:text-gray-100
                  mt-1
                "
              >
                {formatNumber(
                  position.currentPrice
                )}
              </div>
            </div>
          </div>

          {/* PNL SUMMARY */}

          <div
            className="
              mt-4
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-3
              rounded-xl
              bg-gray-50
              dark:bg-gray-900/40
              p-3
            "
          >
            <div>
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Price Change
              </div>

              <div
                className={`
                  text-xl
                  font-bold
                  mt-1
                  ${getChangeClass(changePercent)}
                `}
              >
                {changePercent.toFixed(2)}%
              </div>
            </div>

            <div className="sm:text-right">
              <div
                className="
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                PnL
              </div>

              <div
                className={`
                  text-lg
                  font-semibold
                  mt-1
                  ${getChangeClass(pnlSol)}
                `}
              >
                {formatNumber(pnlSol)} SOL
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* AI INTELLIGENCE */}
          {/* ================================================= */}

          <AIPositionIntelligence
            position={position}
          />

          {/* ================================================= */}
          {/* MANUAL ACTIONS */}
          {/* ================================================= */}

          <div
            className="
              mt-5
              rounded-xl
              border
              border-gray-200
              dark:border-gray-700
              p-4
            "
          >
            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                sm:justify-between
                gap-2
                mb-3
              "
            >
              <div>
                <div
                  className="
                    text-sm
                    font-semibold
                    text-gray-900
                    dark:text-gray-100
                  "
                >
                  Manual Action
                </div>

                <div
                  className="
                    text-xs
                    text-gray-500
                    dark:text-gray-400
                    mt-1
                  "
                >
                  Execute a manual partial or full sell.
                </div>
              </div>

              {confidence > 0 && (
                <div
                  className="
                    text-xs
                    text-gray-500
                    dark:text-gray-400
                  "
                >
                  AI confidence:{" "}
                  <span
                    className={`
                      font-semibold
                      ${getConfidenceClass(confidence)}
                    `}
                  >
                    {confidence}%
                  </span>
                </div>
              )}
            </div>

            <div
              className="
                grid
                grid-cols-2
                sm:grid-cols-4
                gap-2
              "
            >
              {[25, 50, 75, 100].map(
                (percent) => (
                  <button
                    key={percent}
                    onClick={() =>
                      handleSellPercent(
                        position.mint,
                        percent
                      )
                    }
                    className="
                      py-2.5
                      rounded-lg
                      text-xs
                      font-medium
                      border
                      border-gray-300
                      dark:border-gray-600
                      bg-white
                      dark:bg-gray-800
                      text-gray-900
                      dark:text-gray-100
                      hover:bg-gray-100
                      dark:hover:bg-gray-700
                      transition
                    "
                  >
                    {percent === 100
                      ? "Sell All"
                      : `Sell ${percent}%`}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div
      className="
        bg-white
        dark:bg-gray-800
        p-4
        rounded-xl
        shadow-sm
        mt-6
        mb-10
      "
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:justify-between
          sm:items-center
          gap-3
          mb-5
        "
      >
        <div>
          <h2
            className="
              text-xl
              font-semibold
              text-gray-900
              dark:text-gray-100
            "
          >
            Active Positions
          </h2>

          <div
            className="
              text-xs
              text-gray-500
              dark:text-gray-400
              mt-1
            "
          >
            Live positions with AI intelligence
          </div>
        </div>

        <div
          className="
            flex
            gap-2
            flex-wrap
          "
        >
          <button
            onClick={fetchPositions}
            className="
              px-4
              py-2
              rounded-lg
              text-sm
              border
              border-gray-300
              dark:border-gray-700
              bg-white
              dark:bg-gray-700
              text-gray-900
              dark:text-gray-100
              hover:bg-gray-100
              dark:hover:bg-gray-600
              transition
            "
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>

          <button
            onClick={manualSellAll}
            className="
              px-4
              py-2
              rounded-lg
              text-sm
              bg-red-500
              hover:bg-red-600
              text-white
              transition
            "
          >
            Sell All
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* EMPTY STATE */}
      {/* ================================================= */}

      {positions.length === 0 ? (
        <div
          className="
            text-center
            py-10
            text-gray-500
            dark:text-gray-400
          "
        >
          No active positions.
        </div>
      ) : (
        <div className="space-y-5">
          {positions.map((position, index) => (
            <PositionCard
              key={
                position.mint ||
                position.buyTxid ||
                index
              }
              position={position}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}