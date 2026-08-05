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



    const market = data.markets?.[0] || {};
    const lp = market.lp || {};

    const risks = Array.isArray(data.risks)
      ? data.risks
      : [];

    const unlockedLiquidityRisk = risks.find((risk) => {
      const name = String(
        risk?.name || risk?.title || ""
      ).toLowerCase();

      const description = String(
        risk?.description || ""
      ).toLowerCase();

      return (
        name.includes("liquidity") &&
        (
          name.includes("unlocked") ||
          description.includes("unlocked") ||
          description.includes("remove liquidity")
        )
      );
    });

    // -----------------------------
    // Liquidity Lock Result
    // -----------------------------

    const liquidityLocked = !unlockedLiquidityRisk;

    const liquidityLockReason = unlockedLiquidityRisk
      ? (
          unlockedLiquidityRisk.description ||
          unlockedLiquidityRisk.name ||
          "Unlocked liquidity risk detected"
        )
      : "No unlocked liquidity risk found";

    // -----------------------------
    // Generic Market Intelligence
    // -----------------------------

    const holderCount =
      data.totalHolders ?? 0;

    const totalMarketLiquidity =
      data.totalMarketLiquidity ?? 0;

    const totalStableLiquidity =
      data.totalStableLiquidity ?? 0;

    const lpLockedPct =
      lp.lpLockedPct ?? 0;

    const lpLockedUsd =
      lp.lpLockedUSD ?? 0;

    // -----------------------------
    // RugCheck Intelligence
    // -----------------------------

 const rugcheck = {
    score: data.score ?? null,

    normalizedScore:
        data.score_normalised ?? null,

    risks,

    rugged:
        data.rugged ?? false,

    graphInsidersDetected:
        data.graphInsidersDetected ?? 0,

    freezeAuthority:
        data.freezeAuthority ?? null,

    mintAuthority:
        data.mintAuthority ?? null,

    launchpad:
        data.launchpad?.platform ?? null,

    // NEW
    creator:
        data.creator ?? null,

    creatorBalance:
        data.creatorBalance ?? null,

    creatorTokens:
        data.creatorTokens ?? null,

    knownAccounts:
        data.knownAccounts ?? {},
};
// -----------------------------
// Build Evidence
// -----------------------------

const evidence = {
  strengths: [],
  warnings: [],
  critical: [],
};

if (liquidityLocked === true) {
  evidence.strengths.push(
    "Liquidity is locked."
  );
} else if (liquidityLocked === false) {
  evidence.critical.push(
    "Liquidity is not locked."
  );
}

if (lpLockedPct >= 95) {
  evidence.strengths.push(
    `LP is ${lpLockedPct}% locked.`
  );
} else if (lpLockedPct >= 70) {
  evidence.warnings.push(
    `LP is only ${lpLockedPct}% locked.`
  );
} else {
  evidence.critical.push(
    `Very little LP is locked (${lpLockedPct}%).`
  );
}

if (holderCount >= 1000) {
  evidence.strengths.push(
    `Strong holder base (${holderCount} holders).`
  );
} else if (holderCount >= 250) {
  evidence.strengths.push(
    `Growing holder base (${holderCount} holders).`
  );
} else if (holderCount >= 50) {
  evidence.warnings.push(
    `Small holder base (${holderCount} holders).`
  );
} else {
  evidence.critical.push(
    `Very few holders (${holderCount}).`
  );
}

if (rugcheck.mintAuthority) {
  evidence.critical.push(
    "Mint authority is still enabled."
  );
} else {
  evidence.strengths.push(
    "Mint authority has been revoked."
  );
}

if (rugcheck.freezeAuthority) {
  evidence.critical.push(
    "Freeze authority is still enabled."
  );
} else {
  evidence.strengths.push(
    "Freeze authority has been revoked."
  );
}

if (rugcheck.rugged) {
  evidence.critical.push(
    "Token has been flagged as rugged."
  );
}

if (rugcheck.risks.length === 0) {
  evidence.strengths.push(
    "No RugCheck risks detected."
  );
} else {
  rugcheck.risks.forEach((risk) => {
    evidence.warnings.push(
      risk.name || risk.title || "Unknown risk"
    );
  });
}

if (rugcheck.graphInsidersDetected > 0) {
  evidence.warnings.push(
    `${rugcheck.graphInsidersDetected} insider wallet network(s) detected.`
  );
} else {
  evidence.strengths.push(
    "No insider wallet networks detected."
  );
}

// -----------------------------
// Calculate Security Score
// -----------------------------

let score = 100;

// Critical findings
score -= evidence.critical.length * 25;

// Warnings
score -= evidence.warnings.length * 10;

// Reward good security signals
score += Math.min(
  evidence.strengths.length * 2,
  10
);

// Clamp score
score = Math.max(
  0,
  Math.min(score, 100)
);

// -----------------------------
// Calculate Confidence
// -----------------------------

let confidence = 0;

if (rugcheck.score !== null) confidence += 20;

if (holderCount > 0) confidence += 15;

if (totalMarketLiquidity > 0) confidence += 15;

if (lpLockedPct >= 0) confidence += 15;

if (Array.isArray(rugcheck.risks)) confidence += 15;

if (rugcheck.freezeAuthority !== undefined) confidence += 10;

if (rugcheck.mintAuthority !== undefined) confidence += 10;

confidence = Math.min(confidence, 100);

// -----------------------------
// Determine Verdict
// -----------------------------

let verdict;

if (score >= 90) {
  verdict = "VERY_SAFE";
} else if (score >= 75) {
  verdict = "SAFE";
} else if (score >= 55) {
  verdict = "MODERATE_RISK";
} else if (score >= 35) {
  verdict = "HIGH_RISK";
} else {
  verdict = "DANGEROUS";
}

    return {
  // Existing fields (Backward compatible)
  liquidityLocked,
  liquidityLockSource: "rugcheck",
  liquidityLockReason,

  // Generic intelligence
  holderCount,
  totalMarketLiquidity,
  totalStableLiquidity,
  lpLockedPct,
  lpLockedUsd,

  // Provider intelligence
rugcheck,

developerWallet:
    rugcheck.creator,

developerBalance:
    rugcheck.creatorBalance,

developerKnownAccounts:
    rugcheck.knownAccounts,

developerTokens:
    rugcheck.creatorTokens,

score,
confidence,
verdict,
evidence,

  // AI Evidence
  evidence,
};
  } catch (error) {
    console.warn(
      "fetchLiquidityLockStatus failed:",
      error?.response?.status ||
      error?.message ||
      String(error)
    );

    return {
      liquidityLocked: "unknown",
      liquidityLockSource: "rugcheck",
      liquidityLockReason:
        "Could not verify liquidity lock status",
    };
  }
}