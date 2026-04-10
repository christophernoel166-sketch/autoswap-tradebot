// src/scanner/fetchTokenHolderData.js

import { Connection, PublicKey } from "@solana/web3.js";

const KNOWN_BURN_WALLETS = new Set([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
]);

const KNOWN_PROGRAM_OWNERS = new Set([
  "11111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
]);

const EXCLUDED_OWNER_LABELS = {
  // Add known LP / AMM / treasury / exchange owners here when confirmed
  // "wallet_here": "Pump.fun AMM",
  // "wallet_here": "Raydium LP",
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAddress(value) {
  return typeof value === "string" ? value.trim() : "";
}

function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((safeNumber(value, 0) + Number.EPSILON) * factor) / factor;
}

function getExcludedOwnerLabel(owner) {
  const addr = normalizeAddress(owner);
  if (!addr) return null;
  return EXCLUDED_OWNER_LABELS[addr] || null;
}

function isBurnWallet(owner) {
  const addr = normalizeAddress(owner);
  return !!addr && KNOWN_BURN_WALLETS.has(addr);
}

function isProgramOwner(owner) {
  const addr = normalizeAddress(owner);
  return !!addr && KNOWN_PROGRAM_OWNERS.has(addr);
}

function detectSmartLpSignals({
  owner,
  tokenAccountAddress,
  parsed,
  amount,
  totalSupply,
  marketContext,
}) {
  const reasons = [];
  const sharePercent = totalSupply > 0 ? (amount / totalSupply) * 100 : 0;

  const dexId = String(marketContext?.dexId || "").toLowerCase();
  const labels = Array.isArray(marketContext?.labels)
    ? marketContext.labels.map((x) => String(x).toLowerCase())
    : [];

  const isPumpFunMarket = dexId.includes("pump");
  const isRaydiumMarket = dexId.includes("raydium");
  const isOrcaMarket = dexId.includes("orca");
  const isMeteoraMarket = dexId.includes("meteora");

  const marketLooksLikeAmm =
    isPumpFunMarket ||
    isRaydiumMarket ||
    isOrcaMarket ||
    isMeteoraMarket ||
    labels.some((label) => label.includes("amm")) ||
    labels.some((label) => label.includes("lp")) ||
    labels.some((label) => label.includes("pool"));

  if (!parsed) {
    reasons.push("missing_parsed_data");
  }

  if (parsed?.state && parsed.state !== "initialized") {
    reasons.push("non_initialized_state");
  }

  if (parsed?.isNative === true) {
    reasons.push("native_account");
  }

  if (parsed?.delegate) {
    reasons.push("delegated_account");
  }

  if (!parsed?.tokenAmount) {
    reasons.push("missing_token_amount");
  }

  if (owner === tokenAccountAddress) {
    reasons.push("self_owned_token_account");
  }

  if (typeof owner === "string" && owner.length < 32) {
    reasons.push("invalid_owner_shape");
  }

  // conservative share-based flags
  if (sharePercent >= 25) {
    reasons.push("extreme_share");
  } else if (sharePercent >= 15) {
    reasons.push("very_large_share");
  }

  const structuralOddity =
    !!parsed?.delegate ||
    !parsed?.tokenAmount ||
    (parsed?.state && parsed.state !== "initialized") ||
    owner === tokenAccountAddress ||
    parsed?.isNative === true;

  if (sharePercent >= 15 && structuralOddity) {
    reasons.push("large_share_with_structural_oddity");
  }

  if (marketLooksLikeAmm && sharePercent >= 20) {
    reasons.push("amm_pool_candidate");
  }

  if (marketLooksLikeAmm && sharePercent >= 25) {
  reasons.push("amm_pool_candidate");
}

if (isPumpFunMarket && sharePercent >= 30) {
  reasons.push("pumpfun_pool_candidate");
}

const excludeAsLpOrProtocol =
  reasons.includes("extreme_share") ||
  reasons.includes("large_share_with_structural_oddity") ||
  reasons.includes("amm_pool_candidate") ||
  reasons.includes("pumpfun_pool_candidate") ||
  (marketLooksLikeAmm && structuralOddity && sharePercent >= 20);

  return {
    excludeAsLpOrProtocol,
    reasons,
  };
}

async function getParsedAccountOwner(connection, tokenAccountAddress) {
  try {
    const info = await connection.getParsedAccountInfo(
      new PublicKey(tokenAccountAddress),
      "confirmed"
    );

    const parsed = info?.value?.data?.parsed?.info || null;
    const owner = normalizeAddress(parsed?.owner || tokenAccountAddress);

    return { owner, parsed };
  } catch (error) {
    console.error(`Error resolving owner for ${tokenAccountAddress}:`, error);
    return {
      owner: normalizeAddress(tokenAccountAddress),
      parsed: null,
    };
  }
}

export async function fetchTokenHolderData(tokenMint, options = {}) {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;

  if (!rpcUrl) {
    throw new Error("ALCHEMY_RPC_URL not set");
  }

  if (!tokenMint || typeof tokenMint !== "string") {
    throw new Error("tokenMint is required");
  }

  const mint = tokenMint.trim();
  const mintPubkey = new PublicKey(mint);
  const connection = new Connection(rpcUrl, "confirmed");

  const supplyInfo = await connection.getTokenSupply(mintPubkey);
  const totalSupply = safeNumber(supplyInfo?.value?.uiAmount, 0);

  if (totalSupply <= 0) {
    throw new Error("Invalid token supply");
  }

  const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
  const accounts = largestAccounts?.value || [];

  if (!accounts.length) {
    throw new Error("No token accounts found");
  }

  const topAccounts = accounts.slice(0, 15);
  const resolvedAccounts = [];

  for (const acc of topAccounts) {
    const tokenAccountAddress = normalizeAddress(
      acc?.address?.toBase58?.() || acc?.address
    );

    if (!tokenAccountAddress) continue;

    const amount = safeNumber(acc?.uiAmount, 0);
    if (amount <= 0) continue;

    const { owner, parsed } = await getParsedAccountOwner(
      connection,
      tokenAccountAddress
    );

    const autoDetection = detectSmartLpSignals({
      owner,
      tokenAccountAddress,
      parsed,
      amount,
      totalSupply,
      marketContext: options.marketContext,
    });

    resolvedAccounts.push({
      tokenAccountAddress,
      owner,
      amount: round(amount),
      percent: round((amount / totalSupply) * 100),
      parsed,
      excludeAsLpOrProtocol: autoDetection.excludeAsLpOrProtocol,
      autoDetectionReasons: autoDetection.reasons,
    });

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  const groupedByOwner = new Map();
  const excludedAccounts = [];

  for (const item of resolvedAccounts) {
    const owner = normalizeAddress(item.owner);
    const percent = totalSupply > 0 ? (item.amount / totalSupply) * 100 : 0;

    if (!owner) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner: null,
        amount: item.amount,
        percent: round(percent),
        reason: "missing_owner",
      });
      continue;
    }

    if (isBurnWallet(owner)) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner,
        amount: item.amount,
        percent: round(percent),
        reason: "burn_wallet",
      });
      continue;
    }

    const excludedLabel = getExcludedOwnerLabel(owner);
    if (excludedLabel) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner,
        amount: item.amount,
        percent: round(percent),
        reason: excludedLabel,
      });
      continue;
    }

    if (isProgramOwner(owner)) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner,
        amount: item.amount,
        percent: round(percent),
        reason: "program_owner",
      });
      continue;
    }

    if (item.excludeAsLpOrProtocol) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner,
        amount: item.amount,
        percent: round(percent),
        reason:
          item.autoDetectionReasons?.join(", ") || "lp_or_protocol_candidate",
      });
      continue;
    }

    const current = groupedByOwner.get(owner) || 0;
    groupedByOwner.set(owner, current + item.amount);
  }

  let groupedWallets = Array.from(groupedByOwner.entries())
    .map(([owner, amount]) => ({
      address: owner,
      owner,
      amount: round(amount),
      percent: round(totalSupply > 0 ? (amount / totalSupply) * 100 : 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  // fallback safety:
  // if filtering was too aggressive and removed everything, use resolved owners except obvious burn/program owners
  if (!groupedWallets.length) {
    const fallbackGrouped = new Map();

    for (const item of resolvedAccounts) {
      const owner = normalizeAddress(item.owner);
      if (!owner) continue;
      if (isBurnWallet(owner)) continue;
      if (isProgramOwner(owner)) continue;

      const current = fallbackGrouped.get(owner) || 0;
      fallbackGrouped.set(owner, current + item.amount);
    }

    groupedWallets = Array.from(fallbackGrouped.entries())
      .map(([owner, amount]) => ({
        address: owner,
        owner,
        amount: round(amount),
        percent: round(totalSupply > 0 ? (amount / totalSupply) * 100 : 0),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  const includedHolders = groupedWallets;
  const largestHolderPercent = round(includedHolders[0]?.percent || 0);
  const top10HoldingPercent = round(
    includedHolders
      .slice(0, 10)
      .reduce((sum, h) => sum + safeNumber(h.percent, 0), 0)
  );

  let holderWarning = null;

  if (!includedHolders.length) {
    holderWarning = "No valid holders could be resolved";
  } else if (largestHolderPercent > 25) {
    holderWarning =
      "Very large holder detected — possible LP/AMM/exchange wallet still present";
  }

  return {
    holderCount: includedHolders.length,
    largestHolderPercent,
    top10HoldingPercent,
    topHolders: includedHolders.slice(0, 10),
    excludedAccounts,
    holderWarning,
  };
}