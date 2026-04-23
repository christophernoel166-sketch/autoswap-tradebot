// App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import AutoswapDashboard from "./AutoswapDashboard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useWallet } from "@solana/wallet-adapter-react";
import LandingPage from "./LandingPage";

function AppContent({
  theme,
  setTheme,
  walletAddress,
  connected,
  publicKey,
}) {
  const navigate = useNavigate();
  const location = useLocation();
const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    if (connected && publicKey && location.pathname === "/") {
      navigate("/dashboard");
    }
  }, [connected, publicKey, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Top bar */}
      <div className="px-4 py-3 border-b bg-white dark:bg-gray-800 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Autoswap Trading Dashboard</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-xs px-3 py-2 rounded border
                       bg-gray-100 hover:bg-gray-200
                       dark:bg-gray-700 dark:hover:bg-gray-600
                       dark:border-gray-600 transition"
            title="Toggle theme"
          >
            {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
          </button>

          <WalletMultiButton />
        </div>
      </div>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={<AutoswapDashboard walletAddress={walletAddress} />}
        />
      </Routes>
    </div>
  );
}

export default function App() {
  const { connected, publicKey } = useWallet();
  const [walletAddress, setWalletAddress] = useState("");

  // 🌙 theme: "light" | "dark"
  const [theme, setTheme] = useState(
    localStorage.getItem("autoswap_theme") || "light"
  );

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("autoswap_theme", theme);

    if (connected && publicKey) {
      setWalletAddress(publicKey.toString());
    } else {
      setWalletAddress("");
    }
  }, [theme, connected, publicKey]);
  return (
    <Router>
      <AppContent
        theme={theme}
        setTheme={setTheme}
        walletAddress={walletAddress}
        connected={connected}
        publicKey={publicKey}
      />
    </Router>
  );
}