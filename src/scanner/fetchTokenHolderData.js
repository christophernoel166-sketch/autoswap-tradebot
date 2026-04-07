// src/scanner/fetchTokenHolderData.js

import { Connection, PublicKey } from "@solana/web3.js";

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

function isValidAddress(value) {
  try {
    const v = normalizeAddress(value);
    if (!v) return false;
    new PublicKey(v);
    return true;
  } catch {
    return false;
  }
}

function uniqueAddresses(values = []) {
  return [...new Set(values.map(normalizeAddress).filter(Boolean))];
}

async function getParsedTokenAccountOwners(connection, tokenAccountAddresses = []) {
  const ownerMap = new Map();

  const validAddresses = uniqueAddresses(tokenAccountAddresses).filter(isValidAddress);
  if (!validAddresses.length) return ownerMap;

  const pubkeys = validAddresses.map((addr) => new PublicKey(addr));
  const infos = await connection.getParsedMultipleAccountsInfo(pubkeys, "confirmed");

  for (let i = 0; i < validAddresses.length; i++) {
    const tokenAccountAddress = validAddresses[i];
    const info = infos?.value?.[i];

    let owner = "";

    try {
      const parsed = info?.data?.parsed;
      if (parsed?.type === "account") {
        owner = normalizeAddress(parsed?.info?.owner);
      }
    } catch {
      owner = "";
    }

    ownerMap.set(tokenAccountAddress, owner);
  }

  return ownerMap;
}

/**
 * Resolve token accounts for this mint owned by known market/pool/AMM owner addresses.
 *
 * Example inputs:
 * - pump.fun pair address
 * - AMM authority PDA
 * - pool owner / market owner
 *
 * For each owner, we ask Solana for token accounts owned by that address for THIS mint.
 * Those token accounts are the ones we want excluded from holder concentration.
 */
async function resolveExcludedTokenAccountsByOwners(connection, mintPubkey, ownerAddresses = []) {
  const resolved = new Set();
  const owners = uniqueAddresses(ownerAddresses).filter(isValidAddress);

  for (const ownerAddress of owners) {
    try {
      const ownerPubkey = new PublicKey(ownerAddress);

      const resp = await connection.getParsedTokenAccountsByOwner(
        ownerPubkey,
        { mint: mintPubkey },
        "confirmed"
      );

      const accounts = resp?.value || [];

      for (const item of accounts) {
        const tokenAccountAddress = normalizeAddress(item?.pubkey?.toBase58?.());
        if (tokenAccountAddress) {
          resolved.add(tokenAccountAddress);
        }
      }
    } catch (err) {
      console.warn(
        `[fetchTokenHolderData] failed resolving token accounts for owner ${ownerAddress}:`,
        err?.message || err
      );
    }
  }

  return resolved;
}

function exclusionReason({ address, owner, excludeAddressSet, excludeOwnerSet }) {
  if (excludeAddressSet.has(address)) return "excluded_token_account";
  if (owner && excludeOwnerSet.has(owner)) return "excluded_owner";
  return null;
}

/**
 * fetchTokenHolderData(tokenMint, options)
 *
 * options:
 * - rpcUrl: optional override
 * - excludeAddresses: [tokenAccountAddress, ...]
 * - excludeOwnerAddresses: [ownerAddressOrPda, ...]
 * - marketOwnerAddresses: [pairAddress / poolOwner / marketAuthority, ...]
 * - debug: boolean
 *
 * Returns concentration metrics after exclusions.
 */
export async function fetchTokenHolderData(tokenMint, options = {}) {
  const rpcUrl = options.rpcUrl || process.env.ALCHEMY_RPC_URL;

  if (!rpcUrl) {
    throw new Error("ALCHEMY_RPC_URL not set");
  }

  if (!tokenMint || typeof tokenMint !== "string") {
    throw new Error("tokenMint is required");
  }

  const mint = tokenMint.trim();
  const mintPubkey = new PublicKey(mint);
  const connection = new Connection(rpcUrl, "confirmed");

  // 1) exact token-account exclusions
  const excludeAddressSet = new Set(
    uniqueAddresses(options.excludeAddresses || []).filter(isValidAddress)
  );

  // 2) owner-level exclusions (authority / PDA / pool owner)
  const excludeOwnerSet = new Set(
    uniqueAddresses(options.excludeOwnerAddresses || []).filter(isValidAddress)
  );

  // 3) market/pair addresses -> derive real token accounts for this mint and exclude them
  const marketOwnerAddresses = uniqueAddresses(options.marketOwnerAddresses || []).filter(isValidAddress);

  const derivedExcludedTokenAccounts = await resolveExcludedTokenAccountsByOwners(
    connection,
    mintPubkey,
    marketOwnerAddresses
  );

  for (const addr of derivedExcludedTokenAccounts) {
    excludeAddressSet.add(addr);
  }

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

  // Resolve token-account owner for each largest account
  const largestAccountAddresses = accounts
    .map((acc) => normalizeAddress(acc?.address?.toBase58?.() || acc?.address))
    .filter(Boolean);

  const ownerMap = await getParsedTokenAccountOwners(connection, largestAccountAddresses);

  const holders = accounts
    .map((acc) => {
      const address = normalizeAddress(acc?.address?.toBase58?.() || acc?.address);
      const amount = safeNumber(acc?.uiAmount, 0);
      const percent = totalSupply > 0 ? (amount / totalSupply) * 100 : 0;
      const owner = normalizeAddress(ownerMap.get(address) || "");

      const reason = exclusionReason({
        address,
        owner,
        excludeAddressSet,
        excludeOwnerSet,
      });

      return {
        address,
        owner,
        amount: round(amount),
        percent: round(percent),
        excluded: !!reason,
        exclusionReason: reason,
      };
    })
    .filter((h) => h.amount > 0);

  const includedHolders = holders
    .filter((h) => !h.excluded)
    .sort((a, b) => b.percent - a.percent);

  const excludedAccounts = holders
    .filter((h) => h.excluded)
    .sort((a, b) => b.percent - a.percent);

  const result = {
    holderCount: null, // still intentionally not full-chain holder count
    largestHolderPercent: round(includedHolders[0]?.percent || 0),
    top10HoldingPercent: round(
      includedHolders.slice(0, 10).reduce((sum, h) => sum + safeNumber(h.percent, 0), 0)
    ),
    topHolders: includedHolders.slice(0, 10),
    excludedAccounts,

    // useful for debugging / verifying Pump.fun AMM exclusion
    debug: options.debug
      ? {
          totalSupply: round(totalSupply),
          exactExcludedTokenAccounts: [...excludeAddressSet],
          excludedOwnerAddresses: [...excludeOwnerSet],
          marketOwnerAddresses,
          derivedExcludedTokenAccounts: [...derivedExcludedTokenAccounts],
        }
      : undefined,
  };

  return result;
}