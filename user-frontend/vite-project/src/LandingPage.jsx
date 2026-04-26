import React from "react";
import { useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Helmet } from "react-helmet-async";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
  <>
    <Helmet>
      <title>Autoswaps | Solana Meme Coin Trading Bot</title>
      <meta
        name="description"
        content="Autoswaps is a Solana meme coin trading bot for token scanning, custom trading conditions, chart analysis, and assisted execution."
      />
      <meta
        name="keywords"
        content="Solana trading bot, Solana meme coin bot, crypto trading bot, token scanner, Autoswaps"
      />
    </Helmet>

    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 mb-6">
              Solana Meme Coin Trading Bot
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Trade Solana tokens with speed, structure, and control.
            </h1>

            <p className="text-lg text-gray-300 mb-8 max-w-xl">
              Autoswaps helps you scan tokens, apply your own trading conditions,
              unlock chart analysis, and automate execution from one dashboard.
            </p>

            {/* 🔥 BUTTON SECTION */}
            <div className="flex flex-wrap gap-4 items-center">
              <WalletMultiButton />

              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 font-medium transition"
              >
                Enter Dashboard
              </button>

              {/* ✅ SEO LINK */}
              <a
                href="/best-solana-trading-bot"
                className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-200 transition"
              >
                Learn About the Bot
              </a>

            <a
  href="/faq"
  className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-200 transition"
>
  FAQ
</a>

              <a
                href="#features"
                className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-200 transition"
              >
                Explore Features
              </a>
            </div>

            {/* FEATURES QUICK CARDS */}
            <div className="grid grid-cols-3 gap-4 mt-10">
              <div className="rounded-2xl border border-gray-800 bg-white/5 p-4">
                <div className="text-2xl font-bold">Fast</div>
                <div className="text-sm text-gray-400 mt-1">
                  Scan and review tokens quickly
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-white/5 p-4">
                <div className="text-2xl font-bold">Smart</div>
                <div className="text-sm text-gray-400 mt-1">
                  Use conditions and chart analysis
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-white/5 p-4">
                <div className="text-2xl font-bold">Secure</div>
                <div className="text-sm text-gray-400 mt-1">
                  Non-custodial wallet-based flow
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE CARD */}
          <div>
            <div className="rounded-3xl border border-gray-800 bg-white/5 p-6 shadow-2xl">
              <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-400">
                      Token Scan Preview
                    </div>
                    <div className="text-xl font-semibold mt-1">
                      SCHIZO SIGNALS
                    </div>
                  </div>
                  <div className="rounded-full bg-green-500/20 text-green-300 text-xs px-3 py-1">
                    BUY AVAILABLE
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">Liquidity</div>
                    <div className="text-lg font-semibold mt-1">$49,782</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">Market Cap</div>
                    <div className="text-lg font-semibold mt-1">$327,896</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">Buy / Sell</div>
                    <div className="text-lg font-semibold mt-1">
                      181 / 127
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">Risk Profile</div>
                    <div className="text-lg font-semibold mt-1">CAUTION</div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                  <div className="text-sm text-purple-300 mb-1">
                    Premium Chart Analysis
                  </div>
                  <div className="text-sm text-gray-300">
                    Unlock entry timing, support/resistance, stop loss, and take
                    profit zones before you execute.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <div id="features" className="mt-20 grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-800 bg-white/5 p-6">
            <h3 className="text-xl font-semibold mb-3">Token Scanner</h3>
            <p className="text-gray-400">
              Scan Solana tokens and review liquidity, holder safety, market
              integrity, momentum, and risk structure.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-white/5 p-6">
            <h3 className="text-xl font-semibold mb-3">
              Custom Conditions
            </h3>
            <p className="text-gray-400">
              Save your own conditions and decide how strict or flexible your
              trading filter should be.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-white/5 p-6">
            <h3 className="text-xl font-semibold mb-3">
              Execution Control
            </h3>
            <p className="text-gray-400">
              Manage slippage, MEV protection, TP levels, stop loss, and manual
              execution from one place.
            </p>
          </div>
        </div>

              {/* 🔥 BOTTOM SEO LINK */}
        <div className="mt-12 text-center">
          <a
            href="/best-solana-trading-bot"
            className="text-sm text-purple-400 hover:underline"
          >
            Best Solana Trading Bot Guide →
          </a>
        </div>
      </div>
    </div>
  </>
  );
}