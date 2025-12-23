import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function PositionsPage() {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const tgId = localStorage.getItem("tgId");
    if (!tgId) return;

    fetch(`http://localhost:8081/api/active-positions/${tgId}`)
      .then((res) => res.json())
      .then((data) => setPositions(data.positions || []));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Active Positions</h1>

      {positions.length === 0 ? (
        <p>No active trades.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {positions.map((p) => (
            <div
              key={p.mint}
              className="p-4 bg-white rounded-lg shadow flex justify-between"
            >
              <div>
                <div className="font-semibold">{p.mint}</div>
                <div>Entry: {p.entryPrice}</div>
                <div>Current: {p.currentPrice}</div>
                <div>Change: {p.changePercent}%</div>
                <div>PnL: {p.pnlSol} SOL</div>
              </div>

              <button
                onClick={() => handleSell(p.mint)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Sell
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

function handleSell(mint) {
  const tgId = localStorage.getItem("tgId");
  if (!tgId) return alert("No telegram ID found");

  fetch("http://localhost:8081/api/manual-sell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tgId, mint }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.ok) {
        alert("Sell Complete! TX: " + data.tx);
        window.location.reload();
      } else {
        alert("Sell failed");
      }
    });
}
