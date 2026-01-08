// App.jsx
import React, { useEffect, useState } from "react";
import AutoswapDashboard from "./AutoswapDashboard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useWallet } from "@solana/wallet-adapter-react";

export default function App() {
  const { connected, publicKey } = useWallet();
  const [walletAddress, setWalletAddress] = useState("");

  // 🌙 theme: "light" | "dark"
  const [theme, setTheme] = useState(
    localStorage.getItem("autoswap_theme") || "light"
  );

  useEffect(() => {
    // apply theme globally
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("autoswap_theme", theme);

    // wallet sync (unchanged)
    if (connected && publicKey) setWalletAddress(publicKey.toString());
    else setWalletAddress("");
  }, [theme, connected, publicKey]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Top bar */}
      <div className="px-4 py-3 border-b bg-white dark:bg-gray-800 flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Autoswap Trading Dashboard
        </h1>

        <div className="flex items-center gap-3">
          {/* 🌙 Theme toggle */}
          <button
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
            className="text-xs px-3 py-2 rounded border
                       bg-gray-100 hover:bg-gray-200
                       dark:bg-gray-700 dark:hover:bg-gray-600
                       dark:border-gray-600 transition"
            title="Toggle theme"
          >
            {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
          </button>

          {/* Wallet control */}
          <WalletMultiButton />
        </div>
      </div>

      {/* Main dashboard */}
      <AutoswapDashboard walletAddress={walletAddress} />
    </div>
  );
}
