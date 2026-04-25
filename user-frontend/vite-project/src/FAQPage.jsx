import React from "react";
import { useNavigate } from "react-router-dom";

export default function FAQPage() {
  const navigate = useNavigate();

  const faqs = [
    {
      q: "What is Autoswaps?",
      a: "Autoswaps is a Solana meme coin trading dashboard that helps users scan tokens, apply custom conditions, unlock chart analysis, and execute trades with more control.",
    },
    {
      q: "Is Autoswaps a Solana trading bot?",
      a: "Yes. Autoswaps is built for Solana token traders who want faster scanning, better filtering, and assisted trade execution.",
    },
    {
      q: "Can I set my own token conditions?",
      a: "Yes. Users can create custom conditions such as liquidity, market cap, holder safety, buy/sell activity, wallet intelligence, and social requirements.",
    },
    {
      q: "Does Autoswaps automatically buy tokens?",
      a: "Autoswaps is designed to give users control. A token must meet the selected scan mode or custom conditions before the buy option appears.",
    },
    {
      q: "What is chart analysis?",
      a: "Chart analysis is an optional premium feature that reviews price action, support, resistance, entry zones, stop loss areas, and possible take-profit targets.",
    },
    {
      q: "Do I need a wallet to use Autoswaps?",
      a: "Yes. Users connect a Solana wallet to access the dashboard and trading features.",
    },
    {
      q: "Is Autoswaps non-custodial?",
      a: "Autoswaps is designed around wallet-based trading. Users remain in control of their wallet connection and trading decisions.",
    },
    {
      q: "Can Autoswaps detect unsafe tokens?",
      a: "Autoswaps can flag risks such as weak liquidity, holder concentration, suspicious wallet activity, fake momentum, artificial volume, and rug-risk signals.",
    },

    // 🔥 YOUR NEW QUESTIONS (OPTIMIZED)

    {
      q: "Can Autoswaps trade for me automatically from Telegram signals?",
      a: "Yes. Autoswaps can detect contract addresses posted in supported Telegram channels. When a signal appears, the system loads all users subscribed to that channel, checks which users have trading enabled, applies each user’s custom trading settings, executes the trade accordingly, and monitors the position to exit based on each user’s take-profit and stop-loss rules.",
    },
    {
      q: "Can I add my own Telegram channel to the bot?",
      a: "Yes. Channel owners can onboard their Telegram channel into Autoswaps. Once onboarded, any subscriber who enables trading can have trades executed automatically based on signals posted in the channel.",
    },
    {
      q: "Can other users steal my signals if I add my channel?",
      a: "No. Autoswaps includes access control mechanisms to protect channel owners. Only approved subscribers or authorized users can trade signals from a channel. Unauthorized users cannot copy or execute your signals without permission.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <button
          onClick={() => navigate("/")}
          className="mb-8 text-sm text-purple-300 hover:text-purple-200"
        >
          ← Back to Home
        </button>

        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Frequently Asked Questions
        </h1>

        <p className="text-gray-300 text-lg mb-10">
          Learn how Autoswaps works, including token scanning, custom
          conditions, Telegram signal trading, and chart analysis.
        </p>

        <div className="space-y-5">
          {faqs.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-800 bg-white/5 p-6"
            >
              <h2 className="text-xl font-semibold mb-3">{item.q}</h2>
              <p className="text-gray-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6">
          <h2 className="text-2xl font-bold mb-3">Ready to try Autoswaps?</h2>
          <p className="text-gray-300 mb-5">
            Scan Solana meme coins, follow signals, and trade with more control.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 font-medium"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}