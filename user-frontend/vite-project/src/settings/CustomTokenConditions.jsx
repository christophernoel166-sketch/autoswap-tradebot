import React from "react";

function SectionTitle({ children }) {
  return (
    <h4 className="text-sm font-semibold text-gray-200 mt-4 mb-2">
      {children}
    </h4>
  );
}

function InputField({ label, value, onChange, placeholder = "" }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-700 bg-gray-700 px-3 py-2 text-sm text-white outline-none"
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`px-3 py-1 rounded-lg text-sm font-medium ${
          checked
            ? "bg-green-600 text-white"
            : "bg-gray-600 text-gray-200"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </div>
  );
}

export default function CustomTokenConditions({
  customConditionMode,
  setCustomConditionMode,
  tokenConditions,
  setTokenConditions,
  saveSettings,
}) {
  function updateCondition(section, field, value) {
    setTokenConditions((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-white">
          Custom Token Conditions
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Control whether token scans use the default scanner or your saved custom conditions.
        </p>
      </div>

      <ToggleField
        label="Use Custom Condition Mode"
        checked={customConditionMode}
        onChange={setCustomConditionMode}
      />

      {customConditionMode && (
        <div className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
          Default scanner will be bypassed while custom condition mode is ON.
        </div>
      )}

      <SectionTitle>Market</SectionTitle>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="Min Liquidity (USD)"
          value={tokenConditions.market.minLiquidityUsd}
          onChange={(e) =>
            updateCondition("market", "minLiquidityUsd", e.target.value)
          }
        />
        <InputField
          label="Min Market Cap (USD)"
          value={tokenConditions.market.minMarketCapUsd}
          onChange={(e) =>
            updateCondition("market", "minMarketCapUsd", e.target.value)
          }
        />
        <InputField
          label="Max Market Cap (USD)"
          value={tokenConditions.market.maxMarketCapUsd}
          onChange={(e) =>
            updateCondition("market", "maxMarketCapUsd", e.target.value)
          }
        />
        <InputField
          label="Min Buys (5m)"
          value={tokenConditions.market.minBuys5m}
          onChange={(e) =>
            updateCondition("market", "minBuys5m", e.target.value)
          }
        />
        <InputField
          label="Max Sells (5m)"
          value={tokenConditions.market.maxSells5m}
          onChange={(e) =>
            updateCondition("market", "maxSells5m", e.target.value)
          }
        />
        <InputField
          label="Min Age (Minutes)"
          value={tokenConditions.market.minAgeMinutes}
          onChange={(e) =>
            updateCondition("market", "minAgeMinutes", e.target.value)
          }
        />
        <InputField
          label="Max Age (Minutes)"
          value={tokenConditions.market.maxAgeMinutes}
          onChange={(e) =>
            updateCondition("market", "maxAgeMinutes", e.target.value)
          }
        />
      </div>

      <SectionTitle>Holder Safety</SectionTitle>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="Max Largest Holder (%)"
          value={tokenConditions.holderSafety.maxLargestHolderPercent}
          onChange={(e) =>
            updateCondition("holderSafety", "maxLargestHolderPercent", e.target.value)
          }
        />
        <InputField
          label="Max Top 10 Holding (%)"
          value={tokenConditions.holderSafety.maxTop10HoldingPercent}
          onChange={(e) =>
            updateCondition("holderSafety", "maxTop10HoldingPercent", e.target.value)
          }
        />
      </div>

      <SectionTitle>Socials</SectionTitle>
      <div className="space-y-1">
        <ToggleField
          label="Require Website"
          checked={tokenConditions.socials.requireWebsite}
          onChange={(value) =>
            updateCondition("socials", "requireWebsite", value)
          }
        />
        <ToggleField
          label="Require Telegram"
          checked={tokenConditions.socials.requireTelegram}
          onChange={(value) =>
            updateCondition("socials", "requireTelegram", value)
          }
        />
        <ToggleField
          label="Require X Account"
          checked={tokenConditions.socials.requireTwitter}
          onChange={(value) =>
            updateCondition("socials", "requireTwitter", value)
          }
        />
      </div>

      <SectionTitle>Market Integrity</SectionTitle>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="Min Buy/Sell Ratio"
          value={tokenConditions.marketIntegrity.minBuySellRatio5m}
          onChange={(e) =>
            updateCondition("marketIntegrity", "minBuySellRatio5m", e.target.value)
          }
        />
        <InputField
          label="Min Wallet Participation Score"
          value={tokenConditions.marketIntegrity.minWalletParticipationScore}
          onChange={(e) =>
            updateCondition("marketIntegrity", "minWalletParticipationScore", e.target.value)
          }
        />
        <InputField
          label="Min Velocity Sanity Score"
          value={tokenConditions.marketIntegrity.minVelocitySanityScore}
          onChange={(e) =>
            updateCondition("marketIntegrity", "minVelocitySanityScore", e.target.value)
          }
        />
        <InputField
          label="Max Bundle Suspicion Score"
          value={tokenConditions.marketIntegrity.maxBundleSuspicionScore}
          onChange={(e) =>
            updateCondition("marketIntegrity", "maxBundleSuspicionScore", e.target.value)
          }
        />
      </div>

      <div className="space-y-1">
        <ToggleField
          label="Allow Fake Momentum"
          checked={tokenConditions.marketIntegrity.allowFakeMomentum}
          onChange={(value) =>
            updateCondition("marketIntegrity", "allowFakeMomentum", value)
          }
        />
        <ToggleField
          label="Allow Artificial Volume"
          checked={tokenConditions.marketIntegrity.allowArtificialVolume}
          onChange={(value) =>
            updateCondition("marketIntegrity", "allowArtificialVolume", value)
          }
        />
      </div>

      <SectionTitle>Wallet Intelligence</SectionTitle>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="Min Smart Degen Count"
          value={tokenConditions.walletIntelligence.minSmartDegenCount}
          onChange={(e) =>
            updateCondition("walletIntelligence", "minSmartDegenCount", e.target.value)
          }
        />
        <InputField
          label="Max Bot Degen Count"
          value={tokenConditions.walletIntelligence.maxBotDegenCount}
          onChange={(e) =>
            updateCondition("walletIntelligence", "maxBotDegenCount", e.target.value)
          }
        />
        <InputField
          label="Max Rat Trader Count"
          value={tokenConditions.walletIntelligence.maxRatTraderCount}
          onChange={(e) =>
            updateCondition("walletIntelligence", "maxRatTraderCount", e.target.value)
          }
        />
        <InputField
          label="Min Alpha Caller Count"
          value={tokenConditions.walletIntelligence.minAlphaCallerCount}
          onChange={(e) =>
            updateCondition("walletIntelligence", "minAlphaCallerCount", e.target.value)
          }
        />
        <InputField
          label="Max Sniper Wallet Count"
          value={tokenConditions.walletIntelligence.maxSniperWalletCount}
          onChange={(e) =>
            updateCondition("walletIntelligence", "maxSniperWalletCount", e.target.value)
          }
        />
      </div>

      <SectionTitle>Risk Structure</SectionTitle>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="Max Bundled Wallet Count"
          value={tokenConditions.riskStructure.maxBundledWalletCount}
          onChange={(e) =>
            updateCondition("riskStructure", "maxBundledWalletCount", e.target.value)
          }
        />
        <InputField
          label="Max Funding Cluster Score"
          value={tokenConditions.riskStructure.maxFundingClusterScore}
          onChange={(e) =>
            updateCondition("riskStructure", "maxFundingClusterScore", e.target.value)
          }
        />
        <InputField
          label="Max Largest Funding Cluster"
          value={tokenConditions.riskStructure.maxLargestFundingCluster}
          onChange={(e) =>
            updateCondition("riskStructure", "maxLargestFundingCluster", e.target.value)
          }
        />
      </div>

      <SectionTitle>Rug Risk</SectionTitle>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="Max Rug Risk Score"
          value={tokenConditions.rugRisk.maxRugRiskScore}
          onChange={(e) =>
            updateCondition("rugRisk", "maxRugRiskScore", e.target.value)
          }
        />
      </div>

      <button
        type="button"
        onClick={saveSettings}
        className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium py-3"
      >
        Save Custom Conditions
      </button>
    </div>
  );
}