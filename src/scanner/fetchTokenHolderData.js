// src/scanner/fetchTokenHolderData.js

import { Connection, PublicKey } from "@solana/web3.js";
import {
  classifyHolderAccount,
  shouldExcludeClassifiedHolder,
} from "./classifyHolderAccount.js";

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

  const exclusionThreshold = Number.isFinite(options.exclusionThreshold)
    ? options.exclusionThreshold
    : 0.7;

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

  // Build raw holders from largest token accounts
  const rawHolders = accounts
    .map((acc) => {
      const address = normalizeAddress(acc?.address?.toBase58?.() || acc?.address);
      const amount = safeNumber(acc?.uiAmount, 0);
      const percent = totalSupply > 0 ? (amount / totalSupply) * 100 : 0;

      return {
        address,
        amount: round(amount),
        percent: round(percent),
        tokenAccounts: address
          ? [
              {
                address,
                amount: round(amount),
              },
            ]
          : [],
        manuallyExcluded: isExcludedAddress(address, excludeSet),
      };
    })
    .filter((h) => h.amount > 0 && h.address);

  // Fetch account info for classification
  const holderPubkeys = rawHolders.map((holder) => new PublicKey(holder.address));
  const holderAccountInfos = holderPubkeys.length
    ? await connection.getMultipleAccountsInfo(holderPubkeys)
    : [];

  // Classify each holder
  const classifiedHolders = rawHolders.map((holder, idx) => {
    const ownerInfo = holderAccountInfos[idx] || null;

    const classification = classifyHolderAccount({
      tokenMint: mint,
      ownerAddress: holder.address,
      ownerAccountInfo: ownerInfo,
      percent: holder.percent,
      tokenAccounts: holder.tokenAccounts,
    });

    const autoExcluded = shouldExcludeClassifiedHolder(
      classification,
      exclusionThreshold
    );

    const manuallyExcluded = holder.manuallyExcluded;

    const excluded = manuallyExcluded || autoExcluded;

    const exclusionReason = manuallyExcluded
      ? "manual_exclusion"
      : autoExcluded
      ? classification?.label || "classifier_exclusion"
      : null;

    return {
      address: holder.address,
      amount: holder.amount,
      percent: holder.percent,
      tokenAccounts: holder.tokenAccounts,
      classification,
      excluded,
      exclusionReason,
    };
  });

  const includedHolders = classifiedHolders
    .filter((h) => !h.excluded)
    .sort((a, b) => b.percent - a.percent);

  const excludedAccounts = classifiedHolders
    .filter((h) => h.excluded)
    .map((h) => ({
      address: h.address,
      amount: h.amount,
      percent: h.percent,
      exclusionReason: h.exclusionReason,
      classification: h.classification,
    }));

  return {
    holderCount: null, // intentionally removed for now
    largestHolderPercent: round(includedHolders[0]?.percent || 0),
    top10HoldingPercent: round(
      includedHolders
        .slice(0, 10)
        .reduce((sum, h) => sum + safeNumber(h.percent, 0), 0)
    ),
    topHolders: includedHolders.slice(0, 10).map((h) => ({
      address: h.address,
      amount: h.amount,
      percent: h.percent,
      classification: h.classification,
    })),
    excludedAccounts,
  };
}