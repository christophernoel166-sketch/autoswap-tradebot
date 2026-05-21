import axios from "axios";

export async function fetchLiquidityLockStatus(tokenMint) {
  try {
    const cleanMint = String(tokenMint || "").trim();

    if (!cleanMint) {
      return {
        liquidityLocked: "unknown",
        liquidityLockSource: "none",
        liquidityLockReason: "tokenMint missing",
      };
    }

    const res = await axios.get(
      `https://api.rugcheck.xyz/v1/tokens/${cleanMint}/report`,
      {
        timeout: 12_000,
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = res.data || {};

const risks = Array.isArray(data.risks) ? data.risks : [];
    const unlockedLiquidityRisk = risks.find((risk) => {
      const name = String(risk?.name || risk?.title || "").toLowerCase();
      const description = String(risk?.description || "").toLowerCase();

      return (
        name.includes("liquidity") &&
        (name.includes("unlocked") ||
          description.includes("unlocked") ||
          description.includes("remove liquidity"))
      );
    });

    if (unlockedLiquidityRisk) {
      return {
        liquidityLocked: false,
        liquidityLockSource: "rugcheck",
        liquidityLockReason:
          unlockedLiquidityRisk.description ||
          unlockedLiquidityRisk.name ||
          "Unlocked liquidity risk detected",
      };
    }

    return {
      liquidityLocked: true,
      liquidityLockSource: "rugcheck",
      liquidityLockReason: "No unlocked liquidity risk found",
    };
  } catch (error) {
    console.warn(
  "fetchLiquidityLockStatus failed:",
  error?.response?.status || error?.message || String(error)
);

    return {
      liquidityLocked: "unknown",
      liquidityLockSource: "rugcheck",
      liquidityLockReason: "Could not verify liquidity lock status",
    };
  }
}