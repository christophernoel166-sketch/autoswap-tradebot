import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// AI Context
import { AIProvider } from "./context/ai/AIContext";

// Core Solana adapters
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";

// Wallet UI
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

// Wallet Adapters
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// RPC endpoint
const endpoint =
    import.meta.env.VITE_SOLANA_RPC ||
    "https://api.mainnet-beta.solana.com";

// Supported wallets
const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
];

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={true}>
                <WalletModalProvider>
                    <HelmetProvider>
                        <AIProvider>
                            <App />
                        </AIProvider>
                    </HelmetProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    </React.StrictMode>
);