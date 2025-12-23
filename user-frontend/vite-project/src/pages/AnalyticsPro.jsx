import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// AnalyticsPro.jsx
// Drop into src/pages/AnalyticsPro.jsx
// Dependencies: recharts, tailwind (already used in project)

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4000").replace(/\/$/, "");

function formatDateISO(d) {
  try {
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
}

function downloadCSV(filename, rows) {
  const headers = Object.keys(rows[0] || {}).join(",");
  const csv = [headers]
    .concat(rows.map((r) => headers.split(",").map((h) => JSON.stringify(r[h] ?? "")).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPro() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tokenFilter, setTokenFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchTrades();
  }, []);

  async function fetchTrades() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/trades?limit=1000`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      // route /api/trades returns { trades: [...] }
      const list = Array.isArray(data.trades) ? data.trades : data || [];
      // normalize dates and fields
      const normalized = list.map((t) => ({
        id: t._id || t.id || Math.random().toString(36).slice(2),
        token: t.tokenMint || t.token || t.mint || "unknown",
        entry: Number(t.entryPrice || t.entryPrice || 0) || 0,
        exit: Number(t.exitPrice || t.exitPrice || 0) || 0,
        pnlSol:
          typeof t.pnlSol !== "undefined"
            ? Number(t.pnlSol)
            : Number(t.amountSol || t.solAmount || 0) * ((Number(t.exitPrice || 0) - Number(t.entryPrice || 0)) / Math.max(Number(t.entryPrice || 1), 1)),
        amountSol: Number(t.amountSol || t.solAmount || 0) || 0,
        reason: t.reason || t.source || "",
        createdAt: t.createdAt || t.createdAt || t.date || t._id || new Date().toISOString(),
        raw: t,
      }));
      setTrades(normalized);
    } catch (err) {
      console.error("fetch trades", err);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (tokenFilter && !t.token.toLowerCase().includes(tokenFilter.toLowerCase())) return false;
      if (dateFrom && new Date(t.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [trades, tokenFilter, dateFrom, dateTo]);

  // KPIs
  const kpis = useMemo(() => {
    const totalPnL = filtered.reduce((s, t) => s + Number(t.pnlSol || 0), 0);
    const wins = filtered.filter((t) => Number(t.pnlSol) > 0).length;
    const losses = filtered.filter((t) => Number(t.pnlSol) < 0).length;
    const winRate = filtered.length ? (wins / filtered.length) * 100 : 0;

    // equity curve
    const byDate = {};
    filtered
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((t) => {
        const day = formatDateISO(t.createdAt);
        byDate[day] = (byDate[day] || 0) + Number(t.pnlSol || 0);
      });
    const equity = [];
    let cum = 0;
    Object.keys(byDate)
      .sort()
      .forEach((d) => {
        cum += byDate[d];
        equity.push({ date: d, pnl: +cum.toFixed(6) });
      });

    // drawdown calculation
    let peak = -Infinity;
    let maxDD = 0;
    const ddSeries = equity.map((p) => {
      if (p.pnl > peak) peak = p.pnl;
      const dd = peak - p.pnl;
      if (dd > maxDD) maxDD = dd;
      return { date: p.date, drawdown: +dd.toFixed(6) };
    });

    // simple Sharpe: use daily pnl returns (not perfect but indicative)
    const returns = Object.values(byDate).map((v) => Number(v));
    const mean = returns.reduce((s, x) => s + x, 0) / Math.max(1, returns.length);
    const variance = returns.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / Math.max(1, returns.length);
    const sd = Math.sqrt(variance) || 0;
    const sharpe = sd === 0 ? 0 : (mean / sd) * Math.sqrt(252);

    // pnl by token
    const pnlByToken = {};
    filtered.forEach((t) => (pnlByToken[t.token] = (pnlByToken[t.token] || 0) + Number(t.pnlSol || 0)));
    const pnlTokenArray = Object.keys(pnlByToken).map((k) => ({ token: k, pnl: pnlByToken[k] }));

    return {
      totalPnL: +totalPnL.toFixed(6),
      winRate: +winRate.toFixed(2),
      equity,
      drawdownSeries: ddSeries,
      maxDrawdown: +maxDD.toFixed(6),
      sharpe: +sharpe.toFixed(3),
      pnlByToken: pnlTokenArray.sort((a, b) => b.pnl - a.pnl).slice(0, 20),
    };
  }, [filtered]);

  // prepare chart data
  const equityData = kpis.equity.length ? kpis.equity : [{ date: formatDateISO(new Date()), pnl: 0 }];
  const ddData = kpis.drawdownSeries.length ? kpis.drawdownSeries : [{ date: formatDateISO(new Date()), drawdown: 0 }];
  const tokenData = kpis.pnlByToken.length ? kpis.pnlByToken : [];

  const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Analytics Pro — Elite</h1>
          <div className="flex gap-2">
            <input placeholder="token filter" value={tokenFilter} onChange={(e) => setTokenFilter(e.target.value)} className="border rounded px-2 py-1" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border rounded px-2 py-1" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border rounded px-2 py-1" />
            <button className="px-3 py-1 rounded border" onClick={() => fetchTrades()}>Refresh</button>
            <button className="px-3 py-1 rounded border" onClick={() => downloadCSV("trades_export.csv", filtered.map(t => ({time:t.createdAt, token:t.token, pnl:t.pnlSol, entry:t.entry, exit:t.exit})))}>Export CSV</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Total PnL (SOL)</div>
            <div className="text-2xl font-semibold mt-1">{kpis.totalPnL}</div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Win rate</div>
            <div className="text-2xl font-semibold mt-1">{kpis.winRate}%</div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Sharpe (est.)</div>
            <div className="text-2xl font-semibold mt-1">{kpis.sharpe}</div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Max Drawdown (SOL)</div>
            <div className="text-2xl font-semibold mt-1">{kpis.maxDrawdown}</div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-8 bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600 mb-2">Equity Curve</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="pnl" stroke="#4f46e5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-4 bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600 mb-2">Drawdown</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={ddData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#fee2e2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Token breakdown and winloss */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600 mb-2">PnL by Token (top 20)</div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={tokenData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="token" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="pnl" fill="#06b6d4">
                    {tokenData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-6 bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600 mb-2">Win / Loss Breakdown</div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={[{ name: "Wins", value: filtered.filter(t => t.pnlSol>0).length }, { name: "Losses", value: filtered.filter(t => t.pnlSol<=0).length }]} dataKey="value" nameKey="name" outerRadius={100} label>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* extra raw table */}
        <div className="mt-6 bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Raw Trades ({filtered.length})</h4>
            <div className="text-sm text-gray-500">Tip: export CSV to analyze further</div>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-600 sticky top-0 bg-white">
                <tr>
                  <th>Time</th>
                  <th>Token</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>PnL (SOL)</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-1 text-xs">{String(t.createdAt).slice(0, 19)}</td>
                    <td className="font-mono">{t.token}</td>
                    <td>{t.entry.toFixed(6)}</td>
                    <td>{t.exit.toFixed(6)}</td>
                    <td>{Number(t.pnlSol || 0).toFixed(6)}</td>
                    <td>{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
