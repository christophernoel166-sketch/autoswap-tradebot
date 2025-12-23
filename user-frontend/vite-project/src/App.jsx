// App.jsx
import React, { useEffect, useState } from "react";
import AutoswapDashboard from "./AutoswapDashboard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useWallet } from "@solana/wallet-adapter-react";

export default function App() {
  const { connected, publicKey } = useWallet();
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    // apply dark-mode preference on load (global)
    const dm = localStorage.getItem("autoswap_dark") === "1";
    if (dm) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    if (connected && publicKey) setWalletAddress(publicKey.toString());
    else setWalletAddress("");
  }, [connected, publicKey]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Top bar */}
      <div className="p-0.3 border-b bg-white dark:bg-gray-800 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Autoswap Trading Dashboard</h1>
        {/* single canonical wallet control */}
        <WalletMultiButton />
      </div>

      {/* Load dashboard; the dashboard will present connect UI as well */}
      <AutoswapDashboard walletAddress={walletAddress} />
    </div>
  );
}
