import React from "react";
import WalletLoginButton from "../components/WalletLoginButton";

export default function LoginPage({ onLogin }) {
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="p-8 rounded-xl bg-gray-800 shadow-xl text-center w-full max-w-md">

        <h1 className="text-3xl font-bold mb-4">Autoswap</h1>

        <p className="mb-6 text-gray-300">Sign in to your dashboard</p>

        {/* Wallet Login Button */}
        <WalletLoginButton 
          apiBase={import.meta.env.VITE_API_BASE}
          onLogin={onLogin}
        />

        <p className="text-xs text-gray-500 mt-4">
          By connecting, you confirm ownership of the wallet.
        </p>

      </div>
    </div>
  );
}
