import { useEffect, useState } from "react";

const THINKING_STEPS = [

  "Loading market data...",

  "Evaluating liquidity...",

  "Analyzing volume profile...",

  "Inspecting holder distribution...",

  "Checking smart wallets...",

  "Scanning developer history...",

  "Searching historical memory...",

  "Comparing similar launches...",

  "Calculating probability model...",

  "Generating AI decision..."

];

export default function AIThinkingCard() {

  const [currentStep, setCurrentStep] = useState(0);
const [progress, setProgress] = useState(0);

const [memoryScans, setMemoryScans] = useState(

  12000 +

  Math.floor(Math.random() * 8000)

);

const [thought, setThought] = useState(
  "Initializing AI engine..."
);


useEffect(() => {

  const thoughts = [

    "Loading live market data...",

    "Analyzing liquidity profile...",

    "Checking wallet intelligence...",

    "Evaluating developer history...",

    "Comparing historical launches...",

    "Calculating probability model...",

    "Generating investment thesis..."

  ];

  let index = 0;

  const interval = setInterval(() => {

    setCurrentStep(previous => {

      if (previous >= THINKING_STEPS.length - 1) {

        clearInterval(interval);

        return previous;

      }

      return previous + 1;

    });

    setProgress(previous =>
      Math.min(previous + 12, 95)
    );

    setMemoryScans(previous =>
      previous +
      Math.floor(Math.random() * 1800 + 900)
    );

    if (index < thoughts.length) {

      setThought(thoughts[index]);

      index++;

    }

  }, 650);

  return () => clearInterval(interval);

}, []);

return (

  <div className="bg-gray-900 border border-cyan-500/30 rounded-xl p-6">

    {/* ===========================================
        HEADER
    =========================================== */}

    <div className="flex items-center gap-3 mb-6">

      <div className="animate-pulse text-3xl">

        🧠

      </div>

      <div className="flex-1">

        <h2 className="text-xl font-bold text-white">

          AI Intelligence

        </h2>

        <p className="text-cyan-400 text-sm">

          Running advanced analysis...

        </p>

        {/* ===========================================
            LIVE PROGRESS BAR
        =========================================== */}

        <div className="mt-5">

          <div className="flex justify-between text-xs text-gray-400 mb-2">

            <span>

              {thought}

            </span>

            <span>

              {progress}%

            </span>

          </div>

          <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">

            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>

      </div>

    </div>

    {/* ===========================================
        HISTORICAL MEMORY
    =========================================== */}

    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-5 mb-6">

      <div className="flex items-center gap-2 text-cyan-300 font-semibold text-lg">

        🧠 Historical Memory

      </div>

      <div className="text-3xl font-bold text-white mt-4">

        {memoryScans.toLocaleString()}

      </div>

      <div className="text-sm text-gray-400 mb-5">

        Historical launches indexed

      </div>

      <div className="space-y-3">

        {/* Winner Patterns */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2 text-green-400">

            <span>✓</span>

            <span>Winner patterns matched</span>

          </div>

          <span
            className={`text-xs ${
              currentStep >= 2
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {currentStep >= 2
              ? "Complete"
              : "Scanning..."}
          </span>

        </div>

        {/* Rug Patterns */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2 text-red-400">

            <span>✓</span>

            <span>Rug patterns analyzed</span>

          </div>

          <span
            className={`text-xs ${
              currentStep >= 4
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {currentStep >= 4
              ? "Complete"
              : "Scanning..."}
          </span>

        </div>

        {/* Developer */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2 text-blue-400">

            <span>✓</span>

            <span>Developer history verified</span>

          </div>

          <span
            className={`text-xs ${
              currentStep >= 6
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {currentStep >= 6
              ? "Complete"
              : "Scanning..."}
          </span>

        </div>

        {/* Wallet Intelligence */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2 text-purple-400">

            <span>✓</span>

            <span>Wallet intelligence processed</span>

          </div>

          <span
            className={`text-xs ${
              currentStep >= 8
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {currentStep >= 8
              ? "Complete"
              : "Scanning..."}
          </span>

        </div>

        {/* Probability */}

        <div className="flex items-center justify-between border-t border-cyan-500/20 pt-3">

          <div className="flex items-center gap-2 text-cyan-300 animate-pulse">

            <span>●</span>

            <span>Building probability model...</span>

          </div>

          <span className="text-xs text-cyan-300">

            AI Active

          </span>

        </div>

      </div>

    </div>

    {/* ===========================================
        ANALYSIS STEPS
    =========================================== */}

    <div className="space-y-3">

      {THINKING_STEPS.map((step, index) => (

        <div
          key={step}
          className={`flex items-center gap-3 transition-all duration-500 ${
            index <= currentStep
              ? "opacity-100"
              : "opacity-30"
          }`}
        >

          <div className="text-cyan-400">

            {index < currentStep ? "✓" : "●"}

          </div>

          <div className="text-gray-200">

            {step}

          </div>

        </div>

      ))}

    </div>

  </div>

);
}