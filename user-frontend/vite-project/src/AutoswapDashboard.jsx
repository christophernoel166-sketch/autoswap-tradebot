 // AutoswapDashboard.jsx (final — adds Elite Analytics, pro charts, risk metrics)
import React, { useEffect, useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import "@solana/wallet-adapter-react-ui/styles.css";

const API_BASE = (import.meta.env?.VITE_API_BASE || "http://localhost:4000").replace(/\/$/, "");

export default function AutoswapDashboard() {
  const { publicKey, connected } = useWallet();

  const [walletAddress, setWalletAddress] = useState("");
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [userChannels, setUserChannels] = useState([]);
  const [message, setMessage] = useState(null);const [user, setUser] = useState(null);


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
    }
  }, [connected, publicKey]);

  /* --- LOAD CHANNELS --- */
useEffect(() => {
  fetch(`${API_BASE}/api/admin/channels`)
    .then(r => r.json())
    .then(data => setAvailableChannels(data.channels || []))
    .catch(() => {});
}, []);

  /* --- LOAD USER DATA WHEN WALLET CHANGES --- */
  useEffect(() => {
  if (walletAddress) {
    fetchUserSettings();
    fetchUserChannels();
    fetchPositions();
    fetchHistory();
  }
}, [walletAddress]);
// =====================================
// 🔄 AUTO-REFRESH CHANNEL STATUS (STEP 5.5)
// =====================================
useEffect(() => {
  if (!walletAddress) return;

  const interval = setInterval(() => {
    fetchUserChannels();
  }, 8000); // every 8 seconds

  return () => clearInterval(interval);
}, [walletAddress]);


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

  // Subscribe helper
  async function subscribeChannel(ch) {
    if (!walletAddress) return setMessage({ type: "error", text: "Connect wallet first" });
    try {
      const r = await fetch(`${API_BASE}/api/users/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, channel: ch }),
      });
      if (r.ok) setMessage({ type: "success", text: `Subscribed to @${ch}` });
      else setMessage({ type: "error", text: "Subscribe failed" });
    } catch (err) {
      console.warn("subscribeChannel error:", err);
      setMessage({ type: "error", text: "Subscribe failed" });
    }
  }

// ================================
// RE-REQUEST AFTER REJECTION (STEP 5.4)
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
    <div className="p-4 max-w-7xl mx-auto">

      {/* Header with wallet button kept — this was in multiple places earlier.
          If WalletMultiButton is provided elsewhere in App, it will render there too.
          Kept here intentionally for UX parity. */}
      

      {message && (
        <div className={`p-3 rounded mb-4 ${message.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 w-full relative">

        {/* LEFT SECTION – PERFORMANCE + ELITE CHARTS */}
        <div className="col-span-8">

          {/* PERFORMANCE */}
          <div className="bg-white p-4 rounded shadow mb-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500 text-sm">Total PnL</div>
                <div className="text-xl font-semibold">{totalPnl} SOL</div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500 text-sm">Win Rate</div>
                <div className="text-xl font-semibold">{fmt(metrics.winRate,1)}%</div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500 text-sm">Trades</div>
                <div className="text-xl font-semibold">{metrics.trades}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <input className="border px-2 py-1 rounded" placeholder="Filter token" value={tokenFilter} onChange={e => setTokenFilter(e.target.value)} />
              <input type="date" className="border px-2 py-1 rounded" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <input type="date" className="border px-2 py-1 rounded" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* ELITE ANALYTICS PANEL (PRO CHARTS + RISK METRICS) */}
          <div className="bg-white p-4 rounded shadow mb-4">
            <div className="flex items-start justify-between">
              <h3 className="font-medium">Elite Analytics</h3>
              <div className="text-sm text-gray-500">{historyLoading ? "Loading..." : `${filteredHistory.length} trades selected`}</div>
            </div>

            {/* metrics row */}
            <div className="grid grid-cols-6 gap-3 mt-4 text-center">
              <div className="p-2 border rounded">
                <div className="text-xs text-gray-500">Sharpe</div>
                <div className="font-semibold">{fmt(metrics.sharpe,2)}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-gray-500">Sortino</div>
                <div className="font-semibold">{fmt(metrics.sortino,2)}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-gray-500">Max Drawdown</div>
                <div className="font-semibold">{fmt(metrics.maxDrawdown,4)}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-gray-500">Avg Drawdown</div>
                <div className="font-semibold">{fmt(metrics.avgDrawdown,4)}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-gray-500">Profit Factor</div>
                <div className="font-semibold">{metrics.profitFactor === Infinity ? "∞" : fmt(metrics.profitFactor,2)}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-gray-500">Risk of Ruin</div>
                <div className="font-semibold">{fmt(metrics.riskOfRuin,4)}</div>
              </div>
            </div>

            {/* charts */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* cumulative pnl chart */}
              <div className="p-2 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Cumulative PnL</div>
                  <div className="text-xs text-gray-500">total: {fmt(metrics.totalPnl,6)} SOL</div>
                </div>
                <svg width="100%" height="140" viewBox="0 0 760 140" preserveAspectRatio="none">
                  {/* axes */}
                  <rect x="0" y="0" width="760" height="140" fill="transparent" />
                  {(() => {
                    const points = renderCumulativePath(metrics.pnlSeries, 760, 140, 12);
                    if (!points) return null;
                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke={Math.max(...(metrics.pnlSeries||[])) >= 0 ? "#16a34a" : "#ef4444"}
                          strokeWidth={2}
                          points={points}
                        />
                        {/* small circles */}
                        {metrics.pnlSeries.map((v,i) => {
                          const max = Math.max(...metrics.pnlSeries, 0);
                          const min = Math.min(...metrics.pnlSeries, 0);
                          const range = max - min || 1;
                          const padding = 12;
                          const width = 760;
                          const height = 140;
                          const stepX = (width - 2*padding) / Math.max(1, metrics.pnlSeries.length - 1);
                          const x = padding + i * stepX;
                          const y = padding + ( (max - v) / range ) * (height - 2*padding);
                          return <circle key={i} cx={x} cy={y} r={2} fill={v >= 0 ? "#16a34a" : "#ef4444"} />;
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* profit distribution histogram */}
              <div className="p-2 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Profit Distribution</div>
                  <div className="text-xs text-gray-500">buckets: {distribution.length}</div>
                </div>
                <svg width="100%" height="140" viewBox="0 0 760 140" preserveAspectRatio="none">
                  <rect x="0" y="0" width="760" height="140" fill="transparent" />
                  {(() => {
                    if (!distribution.length) return null;
                    const padding = 12;
                    const width = 760 - padding*2;
                    const height = 140 - padding*2;
                    const maxCount = Math.max(...distribution.map(d => d.count), 1);
                    const barW = width / distribution.length;
                    return distribution.map((d,i) => {
                      const x = padding + i * barW;
                      const h = (d.count / maxCount) * height;
                      const y = padding + (height - h);
                      const isPos = d.bucket >= 0;
                      return <rect key={i} x={x+2} y={y} width={Math.max(4, barW-4)} height={Math.max(2, h)} fill={isPos ? "#4f46e5" : "#ef4444"} />;
                    });
                  })()}
                </svg>

                <div className="text-xs text-gray-600 mt-2">
                  Positive buckets to the right, negative to the left (bucket = SOL rounded).
                </div>
              </div>
            </div>
          </div>

        </div>

      
  
        <div className="col-span-4 ml-auto flex flex-col gap-4">

  {/* ADD CHANNEL */}
<div className="bg-white p-4 rounded shadow w-full">
  <h3 className="font-medium mb-2">Add Channel</h3>

  {/* Telegram NOT linked */}
  {!isTelegramLinked ? (
    <>
      {/* Disabled input look */}
      <div className="w-full border rounded px-2 py-2 text-sm bg-gray-100 text-gray-400 cursor-not-allowed">
        Link Telegram to request channels
      </div>

      <p className="text-xs text-red-600 mt-2">
        ⚠️ You must link your Telegram account before requesting channel access.
      </p>

      {/* Telegram deep link */}
      <a
        href="https://t.me/AUTOSWAPPS_BOT?start=link"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-xs px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        🔗 Link Telegram Account
      </a>
    </>
  ) : (
    <>
      {/* Telegram linked → enable dropdown */}
      <select
        className="w-full border rounded px-2 py-2 text-sm"
        defaultValue=""
        onChange={(e) => {
          const channelId = e.target.value;
          if (!channelId) return;
          requestChannel(channelId);
        }}
      >
        <option value="" disabled>
          Select a channel to request access
        </option>

        {availableChannels.map((ch) => (
          <option key={ch.channelId} value={ch.channelId}>
            @{ch.username || ch.title || ch.channelId}
          </option>
        ))}
      </select>

      <p className="text-xs text-gray-500 mt-2">
        Request will be sent to the channel owner for approval.
      </p>
    </>
  )}
</div>

{/* SUBSCRIPTIONS */}
<div className="bg-white p-4 rounded shadow mb-4 w-full">
  <h3 className="font-medium mb-2">Subscriptions</h3>

  {userChannels.length === 0 ? (
    <div className="text-gray-500 text-sm">
      No channel subscriptions yet.
    </div>
  ) : (
    userChannels.map((ch) => {
      const badge = getChannelStatusBadge(ch.channelId);

      return (
        <div
          key={ch.channelId}
          className="flex justify-between items-center border rounded px-2 py-2 mb-2"
        >
          {/* Channel info */}
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              @{ch.username || ch.title || ch.channelId}
            </span>

            <span
              className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${
                badge.color === "green"
                  ? "bg-green-100 text-green-700"
                  : badge.color === "yellow"
                  ? "bg-yellow-100 text-yellow-700"
                  : badge.color === "red"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {badge.label}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 items-center">
            {ch.status === "rejected" && (
              <button
                onClick={() => reRequestChannel(ch.channelId)}
                className="text-xs px-2 py-1 border rounded bg-yellow-100"
              >
                Re-request
              </button>
            )}

            {ch.enabled ? (
              <button
                onClick={() => toggleChannel(ch.channelId, false)}
                className="text-xs px-2 py-1 border rounded bg-red-100"
              >
                Disable
              </button>
            ) : (
              <button
                disabled={ch.status !== "approved"}
                onClick={() => toggleChannel(ch.channelId, true)}
                className={`text-xs px-2 py-1 border rounded ${
                  ch.status !== "approved"
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-green-100"
                }`}
              >
                Enable
              </button>
            )}
          </div>
        </div>
      );
    })
  )}
</div>




          {/* SETTINGS */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-3">Settings</h3>

            <label className="block text-sm mb-1">Default SOL per trade</label>
            <input type="number" className="border px-2 py-1 w-full mb-2"
              value={solPerTrade} onChange={e => setSolPerTrade(e.target.value)} />

            <label className="block text-sm mb-1">Stop Loss (%)</label>
            <input type="number" className="border px-2 py-1 w-full mb-3"
              value={stopLoss} onChange={e => setStopLoss(e.target.value)} />

            <label className="block text-sm mb-1">Trailing Trigger (%)</label>
            <input type="number" className="border px-2 py-1 w-full mb-3"
              value={trailingTrigger} onChange={e => setTrailingTrigger(e.target.value)} />

            <label className="block text-sm mb-1">Trailing Distance (%)</label>
            <input type="number" className="border px-2 py-1 w-full mb-3"
              value={trailingDistance} onChange={e => setTrailingDistance(e.target.value)} />

            <h4 className="font-medium mt-4 mb-2">Take Profit Levels</h4>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="border px-2 py-1" value={tp1} onChange={e => setTp1(e.target.value)} />
              <input type="number" className="border px-2 py-1" value={tp1Sell} onChange={e => setTp1Sell(e.target.value)} />

              <input type="number" className="border px-2 py-1" value={tp2} onChange={e => setTp2(e.target.value)} />
              <input type="number" className="border px-2 py-1" value={tp2Sell} onChange={e => setTp2Sell(e.target.value)} />

              <input type="number" className="border px-2 py-1" value={tp3} onChange={e => setTp3(e.target.value)} />
              <input type="number" className="border px-2 py-1" value={tp3Sell} onChange={e => setTp3Sell(e.target.value)} />
            </div>

            <button onClick={saveSettings} className="mt-4 w-full py-2 bg-indigo-600 text-white rounded">
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* -------------------  TRADE HISTORY (BOTTOM SECTION) ------------- */}
      {/* ---------------------------------------------------------------- */}

      <div className="bg-white p-4 rounded shadow mt-6">
        <div className="flex justify-between mb-4">
          <h3 className="font-medium">Trade History</h3>
          <span className="text-sm text-gray-500">{filteredHistory.length} records</span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-gray-500">No trades found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Token</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>PnL</th>
                  <th>Buy Tx</th>
                  <th>Sell Tx</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h, i) => {
                  const pnl = (Number(h.exitPrice || 0) - Number(h.entryPrice || 0)) * (Number(h.amountSol || h.solAmount || 0));
                  return (
                    <tr key={i} className="border-t">
                      <td>{String(h.createdAt || "").slice(0, 19)}</td>
                      <td>{h.tokenMint || h.mint}</td>
                      <td>{Number(h.entryPrice || 0).toFixed(6)}</td>
                      <td>{Number(h.exitPrice || 0).toFixed(6)}</td>
                      <td className={pnl >= 0 ? "text-green-600" : "text-red-600"}>{pnl.toFixed(6)}</td>
                      <td className="break-all">{h.buyTxid || "-"}</td>
                      <td className="break-all">{h.sellTxid || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACTIVE POSITIONS (BOTTOM SECTION) */}
      <div className="bg-white p-4 rounded shadow mt-6 mb-10">
        <div className="flex justify-between mb-3">
          <h2 className="text-l font-medium">Active Positions</h2>
          <div className="flex gap-2">
            <button onClick={fetchPositions} className="px-3 py-1 border rounded">
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button onClick={manualSellAll} className="px-3 py-1 border rounded">Sell All</button>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="text-gray-500">No active positions.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Token</th>
                <th>Entry</th>
                <th>Current</th>
                <th>%</th>
                <th>PnL</th>
                <th>TP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={i} className="border-t">
                  <td>{i + 1}</td>
                  <td className="font-mono">{p.mint}</td>
                  <td>{Number(p.entryPrice || 0).toFixed(6)}</td>
                  <td>{Number(p.currentPrice || 0).toFixed(6)}</td>
                  <td className={Number(p.changePercent || 0) >= 0 ? "text-green-600" : "text-red-600"}>
                    {p.changePercent}
                  </td>
                  <td>{Number(p.pnlSol || 0).toFixed(6)}</td>
                  <td>{p.tpStage}</td>
                  <td>
                    <button onClick={() => manualSell(p.mint)} className="px-2 py-1 border rounded">Sell</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}