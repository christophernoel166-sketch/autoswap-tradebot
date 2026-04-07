// src/scanner/fetchTokenHolderData.js

import { Connection, PublicKey } from "@solana/web3.js";

const KNOWN_BURN_WALLETS = new Set([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
]);

const KNOWN_SYSTEM_OR_PROGRAM_OWNERS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "11111111111111111111111111111111",
]);

/**
 * Add known protocol / LP / AMM / exchange owner wallets here.
 * Key = owner wallet address
 * Value = label for debug / exclusion reason
 */
const EXCLUDED_OWNER_LABELS = {
  // Example:
  // "Fzb8RBE1QyJqTvGZUFM4RuKMQ9DLojj15Q9bK8iB61bc": "Pump.fun AMM",
  // "AnotherWalletHere": "Raydium LP",
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAddress(value) {
  return typeof value === "string" ? value.trim() : "";
}

function round(value, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round((safeNumber(value, 0) + Number.EPSILON) * factor) / factor;
}

function isExcludedAddress(address, excludeSet) {
  const addr = normalizeAddress(address);
  return !!addr && excludeSet.has(addr);
}

function isLikelyBurnWallet(owner) {
  const addr = normalizeAddress(owner);
  return !!addr && KNOWN_BURN_WALLETS.has(addr);
}

function getExcludedOwnerLabel(owner) {
  const addr = normalizeAddress(owner);
  if (!addr) return null;
  return EXCLUDED_OWNER_LABELS[addr] || null;
}

function isLikelyNonUserOwner(owner) {
  const addr = normalizeAddress(owner);
  if (!addr) return true;
  if (KNOWN_SYSTEM_OR_PROGRAM_OWNERS.has(addr)) return true;
  if (getExcludedOwnerLabel(addr)) return true;
  return false;
}

function detectNonUserSignals({
  owner,
  tokenAccountAddress,
  parsed,
  amount,
  totalSupply,
  marketContext,
}) {
  const reasons = [];
  const sharePercent = totalSupply > 0 ? (amount / totalSupply) * 100 : 0;

  const dexId = marketContext?.dexId?.toLowerCase?.() || "";
  const labels = (marketContext?.labels || []).map((x) =>
    String(x).toLowerCase()
  );

  const isPumpFunMarket = dexId.includes("pump");
  const isLikelyAmmMarket =
    isPumpFunMarket ||
    dexId.includes("raydium") ||
    dexId.includes("orca") ||
    dexId.includes("meteora") ||
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

  if (sharePercent >= 15) {
    reasons.push("very_large_share");
  }

  if (sharePercent >= 20) {
    reasons.push("extreme_share");
  }

  const hasStructuralOddity =
    !!parsed?.delegate ||
    !parsed?.tokenAmount ||
    (parsed?.state && parsed.state !== "initialized") ||
    owner === tokenAccountAddress;

  if (sharePercent >= 10 && hasStructuralOddity) {
    reasons.push("large_share_with_structural_oddity");
  }

  if (isLikelyAmmMarket && sharePercent >= 15) {
    reasons.push("amm_large_share_candidate");
  }

  if (isPumpFunMarket && sharePercent >= 12) {
    reasons.push("pumpfun_pool_candidate");
  }

  const isLikelyNonUser =
    reasons.includes("extreme_share") ||
    reasons.includes("large_share_with_structural_oddity") ||
    reasons.includes("amm_large_share_candidate") ||
    reasons.includes("pumpfun_pool_candidate") ||
    reasons.length >= 2;

  return {
    isLikelyNonUser,
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

  const excludeSet = new Set(
    (options.excludeAddresses || [])
      .map((x) => normalizeAddress(x))
      .filter(Boolean)
  );

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

  // keep roughly same pattern as the stronger file:
  // inspect only the largest few accounts, resolve owner, then exclude heuristically
  const topAccounts = accounts.slice(0, 12);

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

    const autoDetection = detectNonUserSignals({
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
      isDirectlyExcluded: isExcludedAddress(tokenAccountAddress, excludeSet),
      isLikelyLpOrProtocol: autoDetection.isLikelyNonUser,
      autoDetectionReasons: autoDetection.reasons,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const groupedByOwner = new Map();
  const excludedAccounts = [];

  for (const item of resolvedAccounts) {
    const owner = normalizeAddress(item.owner);
    const percent = totalSupply > 0 ? (item.amount / totalSupply) * 100 : 0;

    if (item.isDirectlyExcluded) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner,
        amount: item.amount,
        percent: round(percent),
        reason: "excludeAddresses",
      });
      continue;
    }

    if (isLikelyBurnWallet(owner)) {
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

    if (item.isLikelyLpOrProtocol) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner,
        amount: item.amount,
        percent: round(percent),
        reason: item.autoDetectionReasons.join(", "),
      });
      continue;
    }

    if (isLikelyNonUserOwner(owner)) {
      excludedAccounts.push({
        address: item.tokenAccountAddress,
        owner,
        amount: item.amount,
        percent: round(percent),
        reason: "non_user_owner",
      });
      continue;
    }

    const current = groupedByOwner.get(owner) || 0;
    groupedByOwner.set(owner, current + item.amount);
  }

  const groupedWallets = Array.from(groupedByOwner.entries())
    .map(([owner, amount]) => ({
      address: owner,
      amount: round(amount),
      percent: round(totalSupply > 0 ? (amount / totalSupply) * 100 : 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  const includedHolders = groupedWallets;
  const largestHolderPercent = round(includedHolders[0]?.percent || 0);
  const top10HoldingPercent = round(
    includedHolders
      .slice(0, 10)
      .reduce((sum, h) => sum + safeNumber(h.percent, 0), 0)
  );

  if (largestHolderPercent > 25) {
    console.log(
      `[HOLDER WARNING] Large holder detected (${largestHolderPercent}%) — likely LP/AMM/exchange not excluded for ${mint}`
    );
  }

  return {
    holderCount: includedHolders.length,
    largestHolderPercent,
    top10HoldingPercent,
    topHolders: includedHolders.slice(0, 10),
    excludedAccounts,
  };
}