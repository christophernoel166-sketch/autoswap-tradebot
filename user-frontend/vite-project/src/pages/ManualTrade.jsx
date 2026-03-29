import React from "react";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

function formatUsd(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right break-all">
        {value}
      </span>
    </div>
  );
}

function LinkRow({ label, url, exists }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 gap-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-sm font-medium text-right">
        {exists && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            Open
          </a>
        ) : (
          <span className="text-gray-900 dark:text-gray-100">Missing</span>
        )}
      </div>
    </div>
  );
}

export default function ManualTrade({
  manualTokenMint,
  setManualTokenMint,
  scanManualToken,
  scanLoading,
  scanResult,
  scanError,
}) {
  const evaluation = scanResult?.evaluation || null;
  const metrics = scanResult?.metrics || null;
  const token = scanResult?.token || null;
  const social = scanResult?.social || null;

  const verdict = evaluation?.verdict || null;
  const showBuy = Boolean(evaluation?.showBuy);

  const verdictColor =
    verdict === "SAFE"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : verdict === "CAUTION"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : verdict === "UNSAFE"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

  return (
    <div className="space-y-6">
      <Section title="Manual Token Scan">
        <div className="space-y-3">
          <input
            type="text"
            value={manualTokenMint}
            onChange={(e) => setManualTokenMint(e.target.value)}
            placeholder="Paste token contract address"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
          />

          <button
            onClick={scanManualToken}
            disabled={scanLoading || !manualTokenMint.trim()}
            className="w-full sm:w-auto px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanLoading ? "Scanning..." : "Scan Token"}
          </button>

          {scanError ? (
            <div className="text-sm text-red-600 dark:text-red-400">
              {scanError}
            </div>
          ) : null}
        </div>
      </Section>

      {scanResult ? (
        <>
          <Section title="Scan Summary">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {token?.name || "Scanned Token"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 break-all">
                  {token?.mintAddress || manualTokenMint}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {token?.boosted ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Boosted
                  </span>
                ) : null}

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${verdictColor}`}
                >
                  {verdict || "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Score
                </div>
                <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {formatValue(evaluation?.score)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Buy Available
                </div>
                <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {showBuy ? "Yes" : "No"}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Expires At
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {scanResult?.expiresAt
                    ? new Date(scanResult.expiresAt).toLocaleTimeString()
                    : "—"}
                </div>
              </div>
            </div>

            {showBuy ? (
              <div className="mt-4">
                <button
                  type="button"
                  className="px-5 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  Buy Token
                </button>
              </div>
            ) : (
              <div className="mt-4 text-sm text-yellow-700 dark:text-yellow-400">
                Buy is unavailable for this token right now.
              </div>
            )}
          </Section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Market">
              <MetricRow
                label="Age"
                value={formatValue(metrics?.ageMinutes, " minutes")}
              />
              <MetricRow
                label="Liquidity"
                value={formatUsd(metrics?.liquidityUsd)}
              />
              <MetricRow
                label="Market Cap"
                value={formatUsd(metrics?.marketCapUsd)}
              />
              <MetricRow
                label="Volume (5m)"
                value={formatUsd(metrics?.volume5mUsd)}
              />
              <MetricRow
                label="Buys / Sells"
                value={`${formatValue(metrics?.buys5m)} / ${formatValue(
                  metrics?.sells5m
                )}`}
              />
            </Section>

            <Section title="Holder Safety">
              <MetricRow
                label="Largest Holder"
                value={formatValue(metrics?.largestHolderPercent, "%")}
              />
              <MetricRow
                label="Top 10 Holding"
                value={formatValue(metrics?.top10HoldingPercent, "%")}
              />
            </Section>

            <Section title="Social / Presence">
              <LinkRow
                label="Website"
                url={social?.websiteUrl}
                exists={social?.hasWebsite}
              />
              <LinkRow
                label="Telegram"
                url={social?.telegramUrl}
                exists={social?.hasTelegram}
              />
              <LinkRow
                label="X Account"
                url={social?.twitterUrl}
                exists={social?.hasTwitter}
              />
              <MetricRow
                label="Website Status"
                value={
                  social?.websiteWorking === true
                    ? "Working"
                    : social?.websiteWorking === false
                    ? "Not Working"
                    : "Not Checked Yet"
                }
              />
              <MetricRow
                label="Telegram Status"
                value={
                  social?.telegramWorking === true
                    ? "Working"
                    : social?.telegramWorking === false
                    ? "Not Working"
                    : social?.hasTelegram
                    ? "Not Checked Yet"
                    : "Missing"
                }
              />
              <MetricRow
                label="X Status"
                value={
                  social?.twitterWorking === true
                    ? "Working"
                    : social?.twitterWorking === false
                    ? "Not Working"
                    : social?.hasTwitter
                    ? "Not Checked Yet"
                    : "Missing"
                }
              />
            </Section>

            <Section title="Activity / Alpha">
              <MetricRow
                label="Alpha Callers"
                value={formatValue(scanResult?.activity?.alphaCallerCount)}
              />
              <MetricRow
                label="X Replies"
                value={
                  scanResult?.activity?.xReplyCount !== null
                    ? scanResult.activity.xReplyCount
                    : "Not Available"
                }
              />
              <MetricRow
                label="Telegram Replies"
                value={
                  scanResult?.activity?.telegramReplyCount !== null
                    ? scanResult.activity.telegramReplyCount
                    : "Not Available"
                }
              />
              <MetricRow
                label="Alpha Caller Score"
                value={
                  scanResult?.activity?.alphaCallerScore != null
                    ? scanResult.activity.alphaCallerScore
                    : "Not Available"
                }
              />
              <MetricRow
                label="X Activity Score"
                value={
                  scanResult?.activity?.xActivityScore !== null
                    ? scanResult.activity.xActivityScore
                    : scanResult?.social?.hasTwitter
                    ? "Low (placeholder)"
                    : "No X"
                }
              />
              <MetricRow
                label="Telegram Activity Score"
                value={
                  scanResult?.activity?.telegramActivityScore !== null
                    ? scanResult.activity.telegramActivityScore
                    : scanResult?.social?.hasTelegram
                    ? "Low (placeholder)"
                    : "No Telegram"
                }
              />
            </Section>

            <Section title="Wallet Intelligence">
              <MetricRow
                label="Smart Degens"
                value={formatValue(metrics?.smartDegenCount)}
              />
              <MetricRow
                label="Bot Degens"
                value={formatValue(metrics?.botDegenCount)}
              />
              <MetricRow
                label="Rat Traders"
                value={formatValue(metrics?.ratTraderCount)}
              />
              <MetricRow
                label="Alpha Callers"
                value={formatValue(metrics?.alphaCallerCount)}
              />
              <MetricRow
                label="Sniper Wallets"
                value={formatValue(metrics?.sniperWalletCount)}
              />
            </Section>

            <Section title="Risk / Structure">
              <MetricRow
                label="Bundle Score"
                value={formatValue(metrics?.bundleScore)}
              />
              <MetricRow
                label="Bundled Wallets"
                value={formatValue(metrics?.bundledWalletCount)}
              />
              <MetricRow
                label="Funding Cluster Score"
                value={formatValue(metrics?.fundingClusterScore)}
              />
              <MetricRow
                label="Largest Funding Cluster"
                value={formatValue(metrics?.largestFundingCluster)}
              />
            </Section>

            <Section title="Momentum">
              <MetricRow
                label="Momentum Score"
                value={formatValue(metrics?.momentumScore)}
              />
              <MetricRow
                label="Velocity Breakout Score"
                value={formatValue(metrics?.velocityBreakoutScore)}
              />
            </Section>

            <Section title="Evaluation">
              <MetricRow label="Verdict" value={formatValue(verdict)} />
              <MetricRow label="Score" value={formatValue(evaluation?.score)} />
              <MetricRow
                label="Scanned At"
                value={
                  scanResult?.scannedAt
                    ? new Date(scanResult.scannedAt).toLocaleString()
                    : "—"
                }
              />
              <MetricRow
                label="Expires At"
                value={
                  scanResult?.expiresAt
                    ? new Date(scanResult.expiresAt).toLocaleString()
                    : "—"
                }
              />
            </Section>
          </div>

          {(evaluation?.reasons?.length > 0 ||
  evaluation?.warnings?.length > 0 ||
  evaluation?.failedRules?.length > 0 ||
  social?.socialWarning ||
  scanResult?.activity?.activityWarning) ? (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <Section title="Reasons">
      {evaluation?.reasons?.length ? (
        <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
          {evaluation.reasons.map((item, idx) => (
            <li key={idx}>• {item}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No reasons available.
        </div>
      )}
    </Section>

    <Section title="Warnings">
      {evaluation?.warnings?.length ||
      social?.socialWarning ? (
        <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">

          {evaluation?.warnings?.map((item, idx) => (
            <li key={`warn-${idx}`}>• {item}</li>
          ))}

          {social?.socialWarning ? (
            <li>• {social.socialWarning}</li>
          ) : null}

        </ul>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No warnings.
        </div>
      )}
    </Section>

              <Section title="Failed Rules">
                {evaluation?.failedRules?.length ? (
                  <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                    {evaluation.failedRules.map((item, idx) => (
                      <li key={`fail-${idx}`}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No failed rules.
                  </div>
                )}
              </Section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}