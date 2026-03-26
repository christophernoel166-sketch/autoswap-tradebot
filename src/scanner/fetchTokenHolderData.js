// src/scanner/fetchTokenHolderData.js

import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const TOKEN_ACCOUNT_SIZE = 165;

const BURN_ADDRESSES = new Set([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
]);

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAddress(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isExcludedAddress(address, excludeAddressesSet) {
  const addr = normalizeAddress(address);
  return !!addr && excludeAddressesSet.has(addr);
}

function sumPercent(items) {
  return items.reduce((sum, item) => sum + safeNumber(item.percent, 0), 0);
}

function round(value, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round((safeNumber(value, 0) + Number.EPSILON) * factor) / factor;
}

function classifyOwnerAccount({
  ownerAddress,
  ownerAccountInfo,
  excludeAddressesSet,
}) {
  if (!ownerAddress) {
    return {
      isExcluded: true,
      exclusionReason: "missing_owner",
      ownerType: "unknown",
    };
  }

  if (BURN_ADDRESSES.has(ownerAddress)) {
    return {
      isExcluded: true,
      exclusionReason: "burn_address",
      ownerType: "burn",
    };
  }

  if (isExcludedAddress(ownerAddress, excludeAddressesSet)) {
    return {
      isExcluded: true,
      exclusionReason: "manual_exclusion",
      ownerType: "excluded",
    };
  }

  if (!ownerAccountInfo) {
    return {
      isExcluded: false,
      exclusionReason: null,
      ownerType: "wallet",
    };
  }

  if (ownerAccountInfo.executable) {
    return {
      isExcluded: true,
      exclusionReason: "executable_program",
      ownerType: "program",
    };
  }

  const accountOwner = normalizeAddress(ownerAccountInfo.owner?.toBase58?.());

  // Real user wallets are usually owned by the System Program.
  // Program-owned accounts / PDAs are often AMMs, treasuries, vaults, etc.
  if (accountOwner && accountOwner !== SystemProgram.programId.toBase58()) {
    return {
      isExcluded: true,
      exclusionReason: "program_owned_account",
      ownerType: "program_owned",
    };
  }

  return {
    isExcluded: false,
    exclusionReason: null,
    ownerType: "wallet",
  };
}

/**
 * Fetch holder data for a token mint using full token-account enumeration.
 *
 * This is much more accurate than getTokenLargestAccounts() because it:
 * - scans all token accounts for the mint
 * - aggregates by owner
 * - returns both raw and adjusted holder metrics
 *
 * @param {string} tokenMint
 * @param {object} options
 * @param {string[]} [options.excludeAddresses] - known addresses to exclude (AMMs, LPs, etc.)
 * @param {number} [options.timeoutMs]
 */
export async function fetchTokenHolderData(tokenMint, options = {}) {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;

  if (!rpcUrl) {
    throw new Error("ALCHEMY_RPC_URL not set");
  }

  if (!tokenMint || typeof tokenMint !== "string") {
    throw new Error("tokenMint is required");
  }

  const mintAddress = tokenMint.trim();
  const mintPubkey = new PublicKey(mintAddress);
  const connection = new Connection(rpcUrl, "confirmed");

  const excludeAddressesSet = new Set(
    (options.excludeAddresses || [])
      .map((x) => normalizeAddress(x))
      .filter(Boolean)
  );

  // 1. Get token supply
  const supplyInfo = await connection.getTokenSupply(mintPubkey);
  const totalSupplyUi = safeNumber(supplyInfo?.value?.uiAmount, 0);

  if (totalSupplyUi <= 0) {
    throw new Error("Invalid token supply");
  }

  // 2. Enumerate all token accounts for this mint
  const parsedAccounts = await connection.getParsedProgramAccounts(
    TOKEN_PROGRAM_ID,
    {
      filters: [
        { dataSize: TOKEN_ACCOUNT_SIZE },
        { memcmp: { offset: 0, bytes: mintAddress } },
      ],
    }
  );

  // 3. Normalize non-zero token accounts
  const nonZeroTokenAccounts = parsedAccounts
    .map((entry) => {
      const parsed = entry?.account?.data?.parsed?.info;
      const tokenAmount = parsed?.tokenAmount;
      const owner = normalizeAddress(parsed?.owner);
      const tokenAccountAddress = normalizeAddress(entry?.pubkey?.toBase58?.());
      const uiAmount = safeNumber(tokenAmount?.uiAmount, 0);

      return {
        tokenAccountAddress,
        owner,
        uiAmount,
      };
    })
    .filter(
      (item) =>
        item.owner &&
        item.tokenAccountAddress &&
        safeNumber(item.uiAmount, 0) > 0
    );

  // 4. Aggregate by owner (real holder logic)
  const ownerMap = new Map();

  for (const acc of nonZeroTokenAccounts) {
    if (!ownerMap.has(acc.owner)) {
      ownerMap.set(acc.owner, {
        owner: acc.owner,
        totalUiAmount: 0,
        tokenAccounts: [],
      });
    }

    const holder = ownerMap.get(acc.owner);
    holder.totalUiAmount += safeNumber(acc.uiAmount, 0);
    holder.tokenAccounts.push({
      address: acc.tokenAccountAddress,
      amount: safeNumber(acc.uiAmount, 0),
    });
  }

  const rawHolders = Array.from(ownerMap.values())
    .map((holder) => ({
      owner: holder.owner,
      amount: holder.totalUiAmount,
      percent: (holder.totalUiAmount / totalSupplyUi) * 100,
      tokenAccounts: holder.tokenAccounts,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 5. Fetch owner account infos for classification
  const ownerPubkeys = rawHolders.map((h) => new PublicKey(h.owner));
  const ownerInfos = ownerPubkeys.length
    ? await connection.getMultipleAccountsInfo(ownerPubkeys)
    : [];

  const classifiedRawHolders = rawHolders.map((holder, idx) => {
    const ownerInfo = ownerInfos[idx] || null;
    const tokenAccountExcluded = holder.tokenAccounts.some((ta) =>
      isExcludedAddress(ta.address, excludeAddressesSet)
    );

    let classification = classifyOwnerAccount({
      ownerAddress: holder.owner,
      ownerAccountInfo: ownerInfo,
      excludeAddressesSet,
    });

    if (!classification.isExcluded && tokenAccountExcluded) {
      classification = {
        isExcluded: true,
        exclusionReason: "manual_token_account_exclusion",
        ownerType: "excluded",
      };
    }

    return {
      ...holder,
      amount: round(holder.amount),
      percent: round(holder.percent),
      ownerType: classification.ownerType,
      excluded: classification.isExcluded,
      exclusionReason: classification.exclusionReason,
    };
  });

  const adjustedHolders = classifiedRawHolders
    .filter((holder) => !holder.excluded)
    .sort((a, b) => b.amount - a.amount);

  // 6. Compute raw metrics
  const rawHolderCount = classifiedRawHolders.length;
  const rawLargestHolderPercent = safeNumber(
    classifiedRawHolders[0]?.percent,
    0
  );
  const rawTop10HoldingPercent = round(
    sumPercent(classifiedRawHolders.slice(0, 10))
  );

  // 7. Compute adjusted metrics (real user-facing metrics)
  const holderCount = adjustedHolders.length;
  const largestHolderPercent = safeNumber(adjustedHolders[0]?.percent, 0);
  const top10HoldingPercent = round(sumPercent(adjustedHolders.slice(0, 10)));

  const excludedAccounts = classifiedRawHolders
    .filter((holder) => holder.excluded)
    .map((holder) => ({
      owner: holder.owner,
      amount: holder.amount,
      percent: holder.percent,
      ownerType: holder.ownerType,
      exclusionReason: holder.exclusionReason,
      tokenAccounts: holder.tokenAccounts,
    }));

  return {
    // User-facing adjusted values
    holderCount,
    largestHolderPercent: round(largestHolderPercent),
    top10HoldingPercent: round(top10HoldingPercent),

    // Raw values for transparency/debugging
    rawHolderCount,
    rawLargestHolderPercent: round(rawLargestHolderPercent),
    rawTop10HoldingPercent: round(rawTop10HoldingPercent),

    totalSupplyUi: round(totalSupplyUi),
    topHolders: adjustedHolders.slice(0, 10),
    rawTopHolders: classifiedRawHolders.slice(0, 10),
    excludedAccounts,
  };
}