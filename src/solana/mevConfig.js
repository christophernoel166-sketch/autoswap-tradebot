// src/solana/mevConfig.js

export function getMevProtectedSwapConfig({ slippageBps }) {
  return {
    slippageBps,              // user-defined (from Step 2)
    onlyDirectRoutes: true,   // 🚫 blocks multi-hop sandwich vectors
    asLegacyTransaction: false,
    dynamicComputeUnitLimit: true,

    // Priority fees (anti-front-run)
    prioritizationFeeLamports: {
      priorityLevelWithMaxLamports: {
        priorityLevel: "veryHigh",
        maxLamports: 1_500_000, // ~0.0015 SOL max tip
      },
    },

    // Extra safety
    restrictIntermediateTokens: true,
  };
}
