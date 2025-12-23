import { useState } from "react";
import Layout from "../components/Layout";

// API base for your backend (dashboard API)
const API_BASE = "http://localhost:4000";

export default function RegisterPage() {
  const [wallet, setWallet] = useState("");
  const [tgId, setTgId] = useState(""); // <-- user-provided Telegram ID
  const [status, setStatus] = useState("");

  const handleRegister = async () => {
    // basic validation
    if (!wallet) {
      setStatus("⚠️ Enter a wallet address first");
      return;
    }
    if (!tgId) {
      setStatus("⚠️ Enter your Telegram ID (tgId) first");
      return;
    }

    setStatus("⏳ Registering...");

    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: backend expects "tgId" key (not "telegramId")
        body: JSON.stringify({
          tgId,
          wallet,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("✅ Wallet registered successfully!");
        setWallet("");
        // keep tgId so user can register multiple wallets if needed
      } else {
        // show server-provided message if available
        setStatus("❌ Failed: " + (data.error || data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to connect to backend");
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Register Wallet</h1>

      <div className="bg-white shadow p-6 rounded max-w-md">
        <label className="block font-semibold mb-2">Telegram ID (tgId)</label>
        <input
          type="text"
          value={tgId}
          onChange={(e) => setTgId(e.target.value.trim())}
          placeholder="Your Telegram ID (e.g. 123456789) — required"
          className="w-full border rounded p-2 mb-4"
        />

        <label className="block font-semibold mb-2">SOL Wallet Address</label>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value.trim())}
          placeholder="Enter your Solana wallet address"
          className="w-full border rounded p-2 mb-4"
        />

        <button
          onClick={handleRegister}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Register Wallet
        </button>

        {status && <p className="mt-4 text-sm">{status}</p>}

        <p className="mt-4 text-xs text-gray-500">
          Note: if you don't know your Telegram ID, you can send /start to @userinfobot
          on Telegram or provide it from your Telegram profile. Later we can add
          Telegram OAuth so this step is automatic.
        </p>
      </div>
    </Layout>
  );
}
