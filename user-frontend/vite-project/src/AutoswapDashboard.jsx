 // AutoswapDashboard.jsx (final — adds Elite Analytics, pro charts, risk metrics)
import React, { useEffect, useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import "@solana/wallet-adapter-react-ui/styles.css";
import MobileHeader from "./layout/MobileHeader";
import MobileTabs from "./layout/MobileTabs";
import PerformanceSummary from "./analytics/PerformanceSummary";
import EliteAnalytics from "./analytics/EliteAnalytics";
import AddChannel from "./channels/AddChannel";
import Subscriptions from "./channels/Subscriptions";
import TradingSettings from "./settings/TradingSettings";
import ActivePositions from "./positions/ActivePositions";
import TradeHistory from "./history/TradeHistory";
import Sidebar from "./layout/Sidebar";
import MainPanel from "./layout/MainPanel";


const API_BASE = (import.meta.env?.VITE_API_BASE || "http://localhost:4000").replace(/\/$/, "");

export default function AutoswapDashboard() {
  const { publicKey, connected } = useWallet();

  const [walletAddress, setWalletAddress] = useState("");
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [userChannels, setUserChannels] = useState([]);
  const [message, setMessage] = useState(null);const [user, setUser] = useState(null);
// ================================
// LINK TELEGRAM POPUP STATE
// ================================
const [linkCode, setLinkCode] = useState(null);
const [showLinkModal, setShowLinkModal] = useState(false);
const [linkLoading, setLinkLoading] = useState(false);
const [showLinkPopup, setShowLinkPopup] = useState(false);
// ================================
// MOBILE TABS (STEP 2)
// ================================
const [mobileTab, setMobileTab] = useState("dashboard");
// "dashboard" | "channels" | "settings"


const isTelegramLinked = !!user?.telegram?.userId;


  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [solPerTrade, setSolPerTrade] = useState(0.01);
  const [stopLoss, setStopLoss] = useState(10);
  const [trailingTrigger, setTrailingTrigger] = useState(5);
  const [trailingDistance, setTrailingDistance] = useState(3);
  const [tp1, setTp1] = useState(10);
  const [tp1Sell, setTp1Sell] = useState(25);
  const [tp2, setTp2] = useState(20);
  const [tp2Sell, setTp2Sell] = useState(35);
  const [tp3, setTp3] = useState(30);
  const [tp3Sell, setTp3Sell] = useState(40);

  const [tokenFilter, setTokenFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* --- SYNC WALLET ADDRESS --- */
useEffect(() => {
  if (connected && publicKey) {
    setWalletAddress(publicKey.toString());
  } else {
    setWalletAddress("");
    setUser(null);
  }
}, [connected, publicKey]);

/* --- LOAD CHANNELS (ADMIN) --- */
useEffect(() => {
  fetch(`${API_BASE}/api/admin/channels`)
    .then(r => r.json())
    .then(data => setAvailableChannels(data.channels || []))
    .catch(() => {});
}, []);

async function ensureUserExists() {
  try {
    await fetch(`${API_BASE}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
      }),
    });
  } catch (err) {
    console.error("Failed to ensure user exists", err);
  }
}

// ===================================================
// 🔗 LINK TELEGRAM ACCOUNT (POPUP VERSION)
// ===================================================
async function linkTelegramAccount() {
  if (!walletAddress) {
    return setMessage({
      type: "error",
      text: "Connect wallet first",
    });
  }

  // 🔒 Already linked → do nothing
  if (isTelegramLinked) return;

  try {
    const r = await fetch(`${API_BASE}/api/users/link-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    });

    const data = await r.json();

    if (!r.ok) {
      return setMessage({
        type: "error",
        text: data.error || "Failed to generate link code",
      });
    }

    // ✅ Store code + open popup
    setLinkCode(data.code);
    setShowLinkPopup(true);

    // 🔁 STEP 2 — REFRESH USER AFTER LINKING
    setTimeout(() => {
      refreshUser();
    }, 1500);

  } catch (err) {
    console.error("linkTelegramAccount error:", err);
    setMessage({
      type: "error",
      text: "Telegram linking failed",
    });
  }
}


async function refreshUser() {
  if (!walletAddress) return;

  try {
    const r = await fetch(
      `${API_BASE}/api/users?walletAddress=${encodeURIComponent(walletAddress)}`
    );
    if (!r.ok) return;

    const data = await r.json();
    setUser(data.user || null);
  } catch (err) {
    console.warn("refreshUser error:", err);
  }
}
// ===================================================
// 🔒 STEP 3 — AUTO-CLOSE LINK POPUP WHEN LINKED
// ===================================================
useEffect(() => {
  if (isTelegramLinked && showLinkPopup) {
    setShowLinkPopup(false);
    setLinkCode(null);

    setMessage({
      type: "success",
      text: "Telegram account linked successfully ✅",
    });
  }
}, [isTelegramLinked]);


/* --- LOAD USER DATA WHEN WALLET CHANGES --- */
useEffect(() => {
  if (!walletAddress) return;

  fetchUserSettings();
refreshUser();

    ensureUserExists();   // 👈 ADD THIS
  fetchUserChannels();
  fetchPositions();
  fetchHistory();
}, [walletAddress]);

/* --- AUTO-REFRESH CHANNEL STATUS --- */
useEffect(() => {
  if (!walletAddress) return;

  const interval = setInterval(() => {
    fetchUserChannels();
  }, 8000);

  return () => clearInterval(interval);
}, [walletAddress]);
// ===================================================
// 🔄 STEP 4.1 — AUTO-REFRESH USER WHILE LINK POPUP OPEN
// ===================================================
useEffect(() => {
  if (!showLinkPopup || !walletAddress) return;

  const interval = setInterval(() => {
    refreshUser(); // checks if telegram.userId now exists
  }, 3000); // every 3 seconds

  return () => clearInterval(interval);
}, [showLinkPopup, walletAddress]);
// ===================================================
// ⏱️ STEP 4.3 — LINK TIMEOUT REMINDER
// ===================================================
useEffect(() => {
  if (!showLinkPopup) return;

  const timer = setTimeout(() => {
    setMessage({
      type: "info",
      text: "After sending the command in Telegram, return here to continue.",
    });
  }, 40000); // 50 seconds

  return () => clearTimeout(timer);
}, [showLinkPopup]);




  /* --- FETCH SETTINGS --- */
  async function fetchUserSettings() {
    try {
      const r = await fetch(`${API_BASE}/api/users?walletAddress=${encodeURIComponent(walletAddress)}`);
      if (!r.ok) return;
      const data = await r.json();
      const u = data.user || data;

      setSolPerTrade(u.solPerTrade ?? solPerTrade);
      setStopLoss(u.stopLoss ?? stopLoss);
      setTrailingTrigger(u.trailingTrigger ?? trailingTrigger);
      setTrailingDistance(u.trailingDistance ?? trailingDistance);
      setTp1(u.tp1 ?? tp1);
      setTp1Sell(u.tp1SellPercent ?? tp1Sell);
      setTp2(u.tp2 ?? tp2);
      setTp2Sell(u.tp2SellPercent ?? tp2Sell);
      setTp3(u.tp3 ?? tp3);
      setTp3Sell(u.tp3SellPercent ?? tp3Sell);
    } catch (err) {
      console.warn("fetchUserSettings error:", err);
    }
  }

/* --- FETCH USER CHANNEL SUBSCRIPTIONS (STEP 5.5) --- */
async function fetchUserChannels() {
  try {
    const r = await fetch(
      `${API_BASE}/api/users?walletAddress=${encodeURIComponent(walletAddress)}`
    );

    if (!r.ok) return;

    const data = await r.json();
    const u = data.user || data;

    // Normalize subscriptions (important for badges & buttons)
    const normalized = (u.subscribedChannels || []).map((c) => ({
      channelId: String(c.channelId),
      enabled: Boolean(c.enabled),
      status: c.status || "approved", // backward compatibility
      requestedAt: c.requestedAt,
      approvedAt: c.approvedAt,
    }));

    setUserChannels(normalized);
  } catch (err) {
    console.warn("fetchUserChannels error:", err);
  }
}



  /* --- FETCH POSITIONS --- */
  async function fetchPositions() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/active-positions/wallet/${encodeURIComponent(walletAddress)}`);
      const data = await r.json();
      setPositions(data.positions || []);
    } catch (err) {
      console.warn("fetchPositions error:", err);
      setPositions([]);
    }
    setLoading(false);
  }

  /* --- FETCH HISTORY --- */
  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/trades/history/${encodeURIComponent(walletAddress)}`);
      const data = await r.json();
      setHistory(data.trades || data.records || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.warn("fetchHistory error:", err);
      setHistory([]);
    }
    setHistoryLoading(false);
  }

/* --- CHANNEL TOGGLE (USER_TOGGLE) --- */
async function toggleChannel(channelId, enabled) {
  if (!walletAddress) {
    return setMessage({ type: "error", text: "Connect wallet first" });
  }

  try {
    await fetch(`${API_BASE}/api/channels/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        channelId,
        enabled,
      }),
    });

 await fetchUserChannels();
    setMessage({
      type: "success",
      text: enabled ? "Channel enabled" : "Channel disabled",
    });
  } catch (err) {
    console.warn("toggleChannel error:", err);
    setMessage({ type: "error", text: "Channel update failed" });
  }
}

function isChannelEnabled(channelId) {
  return userChannels.some(
    (c) => c.channelId === channelId && c.enabled === true
  );
}

// ================================
// CHANNEL STATUS HELPERS (STEP 5)
// ================================

// get full subscription object for a channel
function getChannelSub(channelId) {
  return userChannels.find(c => c.channelId === channelId);
}

// return status label + color
function getChannelStatusBadge(channelId) {
  const sub = getChannelSub(channelId);
  if (!sub) return { label: "Not subscribed", color: "gray" };

  if (sub.status === "pending") {
    return { label: "Pending approval", color: "yellow" };
  }
  if (sub.status === "rejected") {
    return { label: "Rejected", color: "red" };
  }
  if (sub.status === "approved") {
    return { label: "Approved", color: "green" };
  }

  return { label: "Unknown", color: "gray" };
}

// whether enable button should be disabled
function isEnableDisabled(channelId) {
  const sub = getChannelSub(channelId);
  if (!sub) return false;
  return sub.status !== "approved";
}
// whether user can re-request approval
function canReRequest(channelId) {
  const sub = getChannelSub(channelId);
  return sub && sub.status === "rejected";
}


  /* --- SAVE SETTINGS --- */
  async function saveSettings() {
    try {
      await fetch(`${API_BASE}/api/users/update-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          solPerTrade,
          stopLoss,
          trailingTrigger,
          trailingDistance,
          tp1,
          tp1SellPercent: tp1Sell,
          tp2,
          tp2SellPercent: tp2Sell,
          tp3,
          tp3SellPercent: tp3Sell,
        }),
      });
      setMessage({ type: "success", text: "Settings saved" });
      fetchUserSettings();
    } catch (err) {
      console.warn("saveSettings error:", err);
      setMessage({ type: "error", text: "Failed to save settings" });
    }
  }

  /* --- Manual sells (keep existing behavior) --- */
  async function manualSell(mint) {
    if (!confirm(`Sell ${mint}?`)) return;
    try {
      await fetch(`${API_BASE}/api/manual-sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, mint }),
      });
    } catch (err) {
      console.warn("manualSell error:", err);
    }
    fetchPositions();
    fetchHistory();
  }

  async function manualSellAll() {
    if (!confirm("Sell ALL positions?")) return;
    try {
      await fetch(`${API_BASE}/api/manual-sell-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
    } catch (err) {
      console.warn("manualSellAll error:", err);
    }
    fetchPositions();
    fetchHistory();
  }

  

  // ================================
// SUBSCRIBE CHANNEL (DB ONLY)
// ================================
async function subscribeChannel(ch) {
  if (!walletAddress) {
    return setMessage({ type: "error", text: "Connect wallet first" });
  }

  try {
    const r = await fetch(`${API_BASE}/api/users/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        channel: ch,
      }),
    });

    if (!r.ok) {
      throw new Error("Subscribe failed");
    }

    await fetchUserChannels();

    setMessage({
      type: "success",
      text: "Request sent. Waiting for channel owner approval.",
    });
  } catch (err) {
    console.warn("subscribeChannel error:", err);
    setMessage({
      type: "error",
      text: "Failed to request channel access",
    });
  }
}

// ================================
// RE-REQUEST AFTER REJECTION
// ================================
async function reRequestChannel(channelId) {
  if (!walletAddress) {
    return setMessage({ type: "error", text: "Connect wallet first" });
  }

  try {
    const r = await fetch(`${API_BASE}/api/users/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        channel: channelId,
      }),
    });

    if (!r.ok) {
      throw new Error("re-request failed");
    }

    await fetchUserChannels();

    setMessage({
      type: "success",
      text: "Re-request sent. Waiting for approval.",
    });
  } catch (err) {
    console.warn("reRequestChannel error:", err);
    setMessage({
      type: "error",
      text: "Failed to re-request channel",
    });
  }
}


  /* === ANALYTICS: filters, returns, metrics === */
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.filter(h => {
      const tokenOK = tokenFilter ? (h.tokenMint === tokenFilter || h.mint === tokenFilter) : true;
      const date = h.createdAt ? new Date(h.createdAt) : new Date();
      const fromOK = dateFrom ? date >= new Date(dateFrom) : true;
      const toOK = dateTo ? date <= new Date(dateTo) : true;
      return tokenOK && fromOK && toOK;
    });
  }, [history, tokenFilter, dateFrom, dateTo]);

  // compute per-trade pnl and returns
  const tradesWithPnl = useMemo(() => {
    return filteredHistory.map(t => {
      const entry = Number(t.entryPrice || t.entry || 0);
      const exit = Number(t.exitPrice || t.exit || 0);
      const size = Number(t.amountSol || t.solAmount || t.amount || 0);
      const pnl = (exit - entry) * size;
      const ret = entry > 0 ? (exit - entry) / entry : 0;
      return { ...t, entry, exit, size, pnl, ret };
    });
  }, [filteredHistory]);

  // risk and performance metrics
  const metrics = useMemo(() => {
    const list = tradesWithPnl;
    if (!list.length) {
      return {
        totalPnl: 0,
        trades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        sharpe: 0,
        sortino: 0,
        maxDrawdown: 0,
        avgDrawdown: 0,
        riskOfRuin: 0,
        pnlSeries: [],
      };
    }

    const pnlSeries = list.map(t => t.pnl);
    const returns = list.map(t => t.ret);
    const wins = pnlSeries.filter(x => x > 0);
    const losses = pnlSeries.filter(x => x < 0);
    const sumWins = wins.reduce((a, b) => a + b, 0);
    const sumLosses = losses.reduce((a, b) => a + b, 0); // negative
    const avgWin = wins.length ? sumWins / wins.length : 0;
    const avgLoss = losses.length ? sumLosses / losses.length : 0; // negative value
    const profitFactor = sumLosses === 0 ? (sumWins > 0 ? Infinity : 0) : Math.abs(sumWins / sumLosses);

    // expectancy: (W% * avgWin + L% * avgLoss) / |avgLoss|? We'll use: (W% * avgWin + L% * avgLoss) / avgRiskUnit
    const W = list.filter(t => t.pnl > 0).length / list.length;
    const L = list.filter(t => t.pnl <= 0).length / list.length;
    const expectancy = (W * avgWin + L * (avgLoss || 0));

    // sharpe (sample): mean(return)/std(return) * sqrt(N) (annualization not strict here)
    const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
    const stdRet = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanRet, 2), 0) / Math.max(1, returns.length - 1));
    const sharpe = stdRet === 0 ? 0 : (meanRet / stdRet) * Math.sqrt(252); // rough annualization

    // sortino: use downside std (returns < 0)
    const downside = returns.filter(r => r < 0);
    const meanDown = downside.length ? downside.reduce((a,b) => a + Math.pow(b,2), 0) / downside.length : 0;
    const sortino = meanDown === 0 ? 0 : (meanRet / Math.sqrt(meanDown)) * Math.sqrt(252);

    // drawdown calculations on cumulative pnl
    let running = 0;
    let peak = -Infinity;
    let maxDrawdown = 0;
    let drawdowns = [];
    let currentDrawdownStart = null;
    let currentPeak = 0;
    const cumulative = [];

    for (let i = 0; i < pnlSeries.length; i++) {
      running += pnlSeries[i];
      cumulative.push(running);
      if (running > peak) {
        peak = running;
        currentPeak = peak;
        if (currentDrawdownStart !== null) {
          // close previous drawdown
          const dd = currentPeak - running;
          drawdowns.push(dd);
          currentDrawdownStart = null;
        }
      } else {
        const dd = peak - running;
        if (dd > maxDrawdown) maxDrawdown = dd;
        if (currentDrawdownStart === null) currentDrawdownStart = i;
      }
    }
    // average drawdown
    const avgDrawdown = drawdowns.length ? drawdowns.reduce((a,b)=>a+b,0) / drawdowns.length : maxDrawdown;

    // Simple Risk of Ruin (approx): assuming fixed fractional sizing we don't have that.
    // We'll estimate a very rough RoR using Kelly-ish idea: if expectancy<=0, RoR=1 else small.
    // This is only a heuristic displayed to user.
    const riskOfRuin = expectancy <= 0 ? 1 : Math.exp(-expectancy * list.length / Math.max(1, Math.sqrt(returns.length)));

    return {
      totalPnl: pnlSeries.reduce((a,b)=>a+b,0),
      trades: list.length,
      winRate: (W * 100),
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      sharpe,
      sortino,
      maxDrawdown,
      avgDrawdown,
      riskOfRuin,
      pnlSeries: cumulative,
      returns,
    };
  }, [tradesWithPnl]);

  const totalPnl = (metrics.totalPnl || 0).toFixed(6);

  /* === helper: scalable SVG path for cumulative line chart === */
  function renderCumulativePath(series, width = 760, height = 120, padding = 8) {
    if (!series || !series.length) return null;
    const max = Math.max(...series, 0);
    const min = Math.min(...series, 0);
    const range = max - min || 1;
    const stepX = (width - 2*padding) / Math.max(1, series.length - 1);
    const points = series.map((v, i) => {
      const x = padding + i * stepX;
      // invert y: larger values -> smaller y
      const y = padding + ( (max - v) / range ) * (height - 2*padding);
      return `${x},${y}`;
    });
    return points.join(" ");
  }

  /* === histogram helper for distribution of per-trade pnl (buckets) === */
  const distribution = useMemo(() => {
    const buckets = {};
    tradesWithPnl.forEach(t => {
      const key = (Math.round((t.pnl) * 100) / 100).toFixed(2);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    // sort by numeric bucket key
    const arr = Object.entries(buckets).map(([k,v]) => ({ bucket: Number(k), count: v }))
      .sort((a,b) => a.bucket - b.bucket);
    return arr;
  }, [tradesWithPnl]);

  /* === small utility to format numbers safely === */
  const fmt = (n, d=6) => {
    if (!isFinite(n)) return String(n);
    return Number(n).toFixed(d);
  };

  /* === UI === */
  return (
    <div className="p-4 lg:px-4 lg:py-6 max-w-8xl mx-auto space-y-6
                bg-gray-50 dark:bg-gray-900 rounded-xl">



{/* MOBILE HEADER */}
<MobileHeader connected={connected} walletAddress={walletAddress} />



{/* MOBILE TAB BAR */}
<MobileTabs mobileTab={mobileTab} setMobileTab={setMobileTab} />


      {/* Header with wallet button kept — this was in multiple places earlier.
          If WalletMultiButton is provided elsewhere in App, it will render there too.
          Kept here intentionally for UX parity. */}
      
{message && (
  <div className="mb-4">
    {/* ERROR MESSAGE */}
    {message.type === "error" && (
      <div className="p-3 rounded bg-red-100 text-red-800 text-sm">
        ❌ {message.text}
      </div>
    )}

    {/* SUCCESS MESSAGE */}
    {message.type === "success" && (
      <div className="p-3 rounded bg-green-100 text-green-800 text-sm">
        ✅ {message.text}
      </div>
    )}
  </div>
)}

{/* ===================================================
     🔗 LINK TELEGRAM MODAL (POPUP)
=================================================== */}
{showLinkPopup && (
  <div
    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    onClick={() => {
      setShowLinkPopup(false);
      setLinkCode(null);
    }}
  >
    <div
      className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center shadow-xl border border-gray-200 dark:border-gray-700 relative"
      onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
    >

      {/* ❌ CLOSE BUTTON */}
      <button
        onClick={() => {
          setShowLinkPopup(false);
          setLinkCode(null);
        }}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Close"
      >
        ✕
      </button>

      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
        Link Telegram Account
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Send this command to the Telegram bot:
      </p>

      <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 font-mono text-sm mb-4 text-gray-900 dark:text-gray-100">
        /link_wallet {linkCode}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() =>
            navigator.clipboard.writeText(`/link_wallet ${linkCode}`)
          }
          className="text-xs px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
        >
          📋 Copy
        </button>

        <a
          href="https://t.me/AUTOSWAPPS_BOT"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          🚀 Open Telegram Bot
        </a>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
        You can close this window and link Telegram later.
      </p>
    </div>
  </div>
)}


<div className="grid grid-cols-12 gap-6 w-full">




  {/* LEFT SECTION – PERFORMANCE + ELITE CHARTS */}
  <div
  className={`col-span-12 lg:col-span-8 ${
    mobileTab === "dashboard" ? "block" : "hidden"
  } lg:block`}
>
  <div className="space-y-6">
    <PerformanceSummary
      totalPnl={totalPnl}
      metrics={metrics}
      tokenFilter={tokenFilter}
      setTokenFilter={setTokenFilter}
      dateFrom={dateFrom}
      setDateFrom={setDateFrom}
      dateTo={dateTo}
      setDateTo={setDateTo}
      fmt={fmt}
    />

    <EliteAnalytics
      historyLoading={historyLoading}
      filteredTradesCount={filteredHistory.length}
      metrics={metrics}
      distribution={distribution}
      renderCumulativePath={renderCumulativePath}
      fmt={fmt}
    />

    <TradeHistory filteredHistory={filteredHistory} />

    <ActivePositions
      positions={positions}
      loading={loading}
      fetchPositions={fetchPositions}
      manualSell={manualSell}
      manualSellAll={manualSellAll}
    />
  </div>
</div>

  
    {/* RIGHT SIDEBAR — CHANNELS + SETTINGS */}
<div
  className={`col-span-12 lg:col-span-4 space-y-4
              bg-gray-100 dark:bg-gray-800
              rounded-xl p-4
              ${
                mobileTab === "dashboard" ? "block" : "hidden"
              } lg:block lg:sticky lg:top-4 self-start`}
>


  <AddChannel
    isTelegramLinked={isTelegramLinked}
    availableChannels={availableChannels}
    linkTelegramAccount={linkTelegramAccount}
    requestChannel={subscribeChannel}
  />

  <Subscriptions
    userChannels={userChannels}
    toggleChannel={toggleChannel}
    reRequestChannel={reRequestChannel}
    getChannelStatusBadge={getChannelStatusBadge}
  />

  <TradingSettings
    solPerTrade={solPerTrade}
    setSolPerTrade={setSolPerTrade}
    stopLoss={stopLoss}
    setStopLoss={setStopLoss}
    trailingTrigger={trailingTrigger}
    setTrailingTrigger={setTrailingTrigger}
    trailingDistance={trailingDistance}
    setTrailingDistance={setTrailingDistance}
    tp1={tp1}
    setTp1={setTp1}
    tp1Sell={tp1Sell}
    setTp1Sell={setTp1Sell}
    tp2={tp2}
    setTp2={setTp2}
    tp2Sell={tp2Sell}
    setTp2Sell={setTp2Sell}
    tp3={tp3}
    setTp3={setTp3}
    tp3Sell={tp3Sell}
    setTp3Sell={setTp3Sell}
    saveSettings={saveSettings}
  />
</div>
</div>
</div>     
);
}
     
