import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TokenDiscoveryPage() {
  const navigate = useNavigate();
  const [newTokens, setNewTokens] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchNewTokens();
    const interval = setInterval(fetchNewTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  function handleScanToken(mintAddress) {
    navigate(`/dashboard?token=${encodeURIComponent(mintAddress)}`);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-950 text-white px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">New Solana Meme Coins</h1>
            <p className="text-gray-400 mt-2">
              Discover newly listed tokens and scan them before trading.
            </p>
          </div>

          <button
            onClick={fetchNewTokens}
            className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 font-medium"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-300 text-sm">
          Newly created meme coins are highly risky. Always scan before buying.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {newTokens.map((token) => (
            <div
              key={token.mintAddress}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-5"
            >
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
                    {token.name || token.symbol || "New Token"}
                  </div>
                  <div className="text-xs text-gray-400 break-all">
                    {token.mintAddress}
                  </div>
                </div>
              </div>

              <p className="text-gray-300 text-sm line-clamp-3 mb-4">
                {token.mintAddress}
              </p>

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