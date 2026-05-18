import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import CustomTokenConditions from "./settings/CustomTokenConditions";

function formatUsd(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatTokenAge(minutes) {
  const n = Number(minutes);

  if (!Number.isFinite(n)) return "—";

  if (n < 60) return `${Math.round(n)}m`;

  if (n < 1440) {
    const hours = Math.floor(n / 60);
    const mins = Math.round(n % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  const days = Math.floor(n / 1440);
  const hours = Math.floor((n % 1440) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium text-right">{value}</span>
    </div>
  );
}

export default function TokenDiscoveryPage() {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const walletAddress = connected && publicKey ? publicKey.toString() : "";

  const [newTokens, setNewTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [customConditionMode, setCustomConditionMode] = useState(false);
const [savingConditions, setSavingConditions] = useState(false);

  const [tokenConditions, setTokenConditions] = useState({
    market: {
      minLiquidityUsd: "",
      minMarketCapUsd: "",
      maxMarketCapUsd: "",
      minBuys5m: "",
      maxSells5m: "",
      minAgeMinutes: "",
      maxAgeMinutes: "",
    },
    holderSafety: {
      maxLargestHolderPercent: "",
      maxTop10HoldingPercent: "",
    },
    socials: {
      requireWebsite: false,
      requireTelegram: false,
      requireTwitter: false,
    },
    marketIntegrity: {
      minBuySellRatio5m: "",
      minWalletParticipationScore: "",
      minVelocitySanityScore: "",
      maxBundleSuspicionScore: "",
      allowFakeMomentum: true,
      allowArtificialVolume: true,
    },
    walletIntelligence: {
      minSmartDegenCount: "",
      maxBotDegenCount: "",
      maxRatTraderCount: "",
      minAlphaCallerCount: "",
      maxSniperWalletCount: "",
    },
    riskStructure: {
      maxBundledWalletCount: "",
      maxFundingClusterScore: "",
      maxLargestFundingCluster: "",
    },
    rugRisk: {
      maxRugRiskScore: "",
    },
  });

  async function fetchNewTokens() {
    try {
      setLoading(true);

      const API_BASE = import.meta.env.VITE_API_BASE || "";
      const res = await fetch(`${API_BASE}/api/tokens/discover-new`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to fetch new tokens");
      }

      setNewTokens(data.tokens || []);
    } catch (err) {
      console.error("fetchNewTokens error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserSettings() {
    try {
      if (!walletAddress) return;

      const API_BASE = import.meta.env.VITE_API_BASE || "";
      const response = await fetch(
        `${API_BASE}/api/users?walletAddress=${encodeURIComponent(
          walletAddress
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data?.ok || !data?.user) return;

      const user = data.user;
      setCustomConditionMode(!!user.customConditionMode);

      if (user.tokenConditions) {
        setTokenConditions((prev) => ({
          ...prev,
          ...user.tokenConditions,
        }));
      }
    } catch (err) {
      console.error("loadUserSettings error:", err);
    }
  }

  async function saveSettings(nextCustomConditionMode = customConditionMode) {
    try {
      if (!walletAddress) {
        alert("Connect wallet first");
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE || "";
      const response = await fetch(`${API_BASE}/api/users/update-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          customConditionMode: nextCustomConditionMode,
          tokenConditions,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("saveSettings error:", err);
      alert(err.message || "Failed to save settings");
    }
  }

  useEffect(() => {
    fetchNewTokens();

    if (walletAddress) {
      loadUserSettings();
    }

    const interval = setInterval(fetchNewTokens, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  function handleScanToken(mintAddress) {
    const mode = customConditionMode ? "custom" : "default";

    navigate(
      `/dashboard?token=${encodeURIComponent(mintAddress)}&mode=${mode}`
    );
  }

  async function toggleCustomScanner() {
    const nextValue = !customConditionMode;

    setCustomConditionMode(nextValue);
    await saveSettings(nextValue);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-950 text-white px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">New Solana Meme Coins</h1>
            <p className="text-yellow-400 mt-2 text-sm">
              Newly created meme coins are highly risky. Always scan before
              buying.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-300 font-medium">
                Custom Scanner
              </span>

              <button
                type="button"
                onClick={toggleCustomScanner}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                  customConditionMode ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    customConditionMode ? "translate-x-8" : "translate-x-1"
                  }`}
                />
                <span className="absolute text-[10px] font-bold text-white left-2">
                  {customConditionMode ? "" : "OFF"}
                </span>
                <span className="absolute text-[10px] font-bold text-white right-2">
                  {customConditionMode ? "ON" : ""}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowConditionsModal(true)}
                className="text-sm px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium"
              >
                Configure
              </button>
            </div>

            <button
              onClick={fetchNewTokens}
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 font-medium disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {showConditionsModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Custom Token Conditions
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Configure how Autoswaps filters and scans tokens.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConditionsModal(false)}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  Close
                </button>
              </div>

              <div className="p-6">
                <CustomTokenConditions
  customConditionMode={customConditionMode}
  setCustomConditionMode={setCustomConditionMode}
  tokenConditions={tokenConditions}
  setTokenConditions={setTokenConditions}
  saveSettings={async () => {
    try {
      setSavingConditions(true);

      await saveSettings(customConditionMode);

      setTimeout(() => {
        setSavingConditions(false);
        setShowConditionsModal(false);
      }, 700);
    } catch (err) {
      console.error(err);
      setSavingConditions(false);
    }
  }}
  savingConditions={savingConditions}
/>
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {newTokens.map((token) => (
            <div
              key={token.mintAddress}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-5 hover:border-purple-500/50 transition"
            >
              <div className="flex items-center gap-2 mb-3">
                {token.boosted ? (
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                    BOOSTED
                  </span>
                ) : null}

                {token.dexId ? (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                    {String(token.dexId).toUpperCase()}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3 mb-4">
                {token.icon ? (
                  <img
                    src={token.icon}
                    alt={token.symbol || "Token"}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-800" />
                )}

                <div className="min-w-0">
                  <div className="font-bold text-lg truncate">
                    {token.symbol && token.symbol !== "UNKNOWN"
                      ? token.symbol
                      : token.name || "New Token"}
                  </div>

                  <div className="text-sm text-gray-300 truncate">
                    {token.name || "New Solana Token"}
                  </div>

                  <div className="text-xs text-gray-500 break-all">
                    {token.mintAddress}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl bg-gray-950 border border-gray-800 p-4 mb-4">
                <StatRow label="Age" value={formatTokenAge(token.ageMinutes)} />
                <StatRow label="Liquidity" value={formatUsd(token.liquidityUsd)} />
                <StatRow label="Market Cap" value={formatUsd(token.marketCapUsd)} />
                <StatRow label="Volume (5m)" value={formatUsd(token.volume5mUsd)} />
                <StatRow
                  label="Buys / Sells"
                  value={`${token.buys5m ?? 0} / ${token.sells5m ?? 0}`}
                />
              </div>

              <button
                onClick={() => handleScanToken(token.mintAddress)}
                className="w-full px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 font-medium"
              >
                Scan Token
              </button>
            </div>
          ))}
        </div>

        {!loading && newTokens.length === 0 ? (
          <div className="text-gray-400 mt-8">No new tokens found yet.</div>
        ) : null}
      </div>
    </div>
  );
}