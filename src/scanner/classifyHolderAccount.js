// src/scanner/classifyHolderAccount.js

import { PublicKey, SystemProgram } from "@solana/web3.js";

/**
 * First-version hybrid holder classifier
 *
 * Order:
 * 1. exact known labels
 * 2. hard exclusions (burn/null/etc.)
 * 3. auto-detection rules
 * 4. exclude if confidence is high
 */

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();

const BURN_ADDRESSES = new Set([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
]);

/**
 * Global exact labels by address
 * Add known Pump.fun AMM, exchange wallets, LP vaults, treasuries, etc.
 */
export const KNOWN_ADDRESS_LABELS = {
  // Example:
  // "ADDRESS_HERE": {
  //   label: "pump_fun_amm",
  //   type: "amm",
  //   exclude: true,
  //   confidence: 1,
  // },
};

/**
 * Per-mint exact labels
 * Useful when a specific token has a known AMM or protocol holder you want excluded.
 */
export const KNOWN_ADDRESS_LABELS_BY_MINT = {
  // Example:
  // "TOKEN_MINT_HERE": {
  //   "ADDRESS_HERE": {
  //     label: "pump_fun_amm",
  //     type: "amm",
  //     exclude: true,
  //     confidence: 1,
  //   },
  // },
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAddress(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPubkey(value) {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function getKnownLabelForAddress({ tokenMint, address }) {
  const addr = normalizeAddress(address);
  const mint = normalizeAddress(tokenMint);

  if (!addr) return null;

  if (KNOWN_ADDRESS_LABELS[addr]) {
    return {
      source: "global_known_label",
      ...KNOWN_ADDRESS_LABELS[addr],
    };
  }

  if (
    mint &&
    KNOWN_ADDRESS_LABELS_BY_MINT[mint] &&
    KNOWN_ADDRESS_LABELS_BY_MINT[mint][addr]
  ) {
    return {
      source: "mint_known_label",
      ...KNOWN_ADDRESS_LABELS_BY_MINT[mint][addr],
    };
  }

  return null;
}

function inferLikelyExchange({
  ownerAddress,
  ownerAccountInfo,
  percent,
  tokenAccounts,
}) {
  const reasons = [];
  let confidence = 0;

  // Exchange wallets are usually normal system-owned wallets, not executable.
  const ownerProgram = ownerAccountInfo?.owner?.toBase58?.() || null;
  const isSystemOwned = ownerProgram === SYSTEM_PROGRAM_ID;

  if (!isSystemOwned) {
    return null;
  }

  // Heuristic: many token accounts under one owner can suggest service/infra behavior.
  if ((tokenAccounts?.length || 0) >= 3) {
    reasons.push("owner_controls_multiple_token_accounts");
    confidence += 0.2;
  }

  // Heuristic: unusually large holdings on a normal wallet may be service wallet or exchange.
  if (safeNumber(percent) >= 8) {
    reasons.push("large_balance_on_system_wallet");
    confidence += 0.25;
  }

  // Heuristic: lots of lamports on the owner wallet can indicate infrastructure/service usage.
  const lamports = safeNumber(ownerAccountInfo?.lamports, 0);
  if (lamports > 0.5 * 1_000_000_000) {
    reasons.push("high_native_balance");
    confidence += 0.15;
  }

  if (confidence < 0.45) return null;

  return {
    label: "likely_exchange_or_service_wallet",
    type: "exchange_like",
    exclude: false,
    confidence: Math.min(confidence, 0.85),
    reasons,
    source: "heuristic",
  };
}

function inferLikelyAmmOrLp({
  ownerAddress,
  ownerAccountInfo,
  percent,
  tokenAccounts,
}) {
  const reasons = [];
  let confidence = 0;

  const ownerProgram = ownerAccountInfo?.owner?.toBase58?.() || null;
  const isSystemOwned = ownerProgram === SYSTEM_PROGRAM_ID;

  if (ownerAccountInfo?.executable) {
    reasons.push("owner_is_executable_program");
    confidence += 0.95;

    return {
      label: "program_account",
      type: "program",
      exclude: true,
      confidence: Math.min(confidence, 1),
      reasons,
      source: "heuristic",
    };
  }

  // Program-owned non-system accounts are strong AMM/LP/vault candidates.
  if (ownerProgram && !isSystemOwned) {
    reasons.push("owner_is_program_owned");
    confidence += 0.75;
  }

  // Large % + multiple token accounts can suggest LP or AMM infrastructure.
  if (safeNumber(percent) >= 8) {
    reasons.push("high_holder_percentage");
    confidence += 0.15;
  }

  if ((tokenAccounts?.length || 0) >= 2) {
    reasons.push("multiple_token_accounts");
    confidence += 0.1;
  }

  if (confidence < 0.65) return null;

  return {
    label: "likely_amm_lp_or_protocol_account",
    type: "amm_like",
    exclude: true,
    confidence: Math.min(confidence, 0.95),
    reasons,
    source: "heuristic",
  };
}

function inferBurnOrNull({ ownerAddress }) {
  const owner = normalizeAddress(ownerAddress);

  if (!owner) {
    return {
      label: "missing_owner",
      type: "unknown",
      exclude: true,
      confidence: 1,
      reasons: ["missing_owner"],
      source: "hard_rule",
    };
  }

  if (BURN_ADDRESSES.has(owner)) {
    return {
      label: "burn_address",
      type: "burn",
      exclude: true,
      confidence: 1,
      reasons: ["burn_or_null_address"],
      source: "hard_rule",
    };
  }

  return null;
}

/**
 * Classify a holder using hybrid logic.
 *
 * @param {object} params
 * @param {string} params.tokenMint
 * @param {string} params.ownerAddress
 * @param {object|null} params.ownerAccountInfo
 * @param {number} params.percent
 * @param {Array} params.tokenAccounts
 * @returns {{
 *   ownerAddress: string,
 *   label: string,
 *   type: string,
 *   exclude: boolean,
 *   confidence: number,
 *   reasons: string[],
 *   source: string
 * }}
 */
export function classifyHolderAccount({
  tokenMint,
  ownerAddress,
  ownerAccountInfo = null,
  percent = 0,
  tokenAccounts = [],
}) {
  const owner = normalizeAddress(ownerAddress);

  // 1. Exact known labels
  const known = getKnownLabelForAddress({
    tokenMint,
    address: owner,
  });

  if (known) {
    return {
      ownerAddress: owner,
      label: known.label || "known_labeled_account",
      type: known.type || "known",
      exclude: Boolean(known.exclude),
      confidence: safeNumber(known.confidence, 1),
      reasons: known.reasons || ["known_address_match"],
      source: known.source || "known_label",
    };
  }

  // 2. Hard exclusions
  const burnOrNull = inferBurnOrNull({ ownerAddress: owner });
  if (burnOrNull) {
    return {
      ownerAddress: owner,
      ...burnOrNull,
    };
  }

  // 3. Auto-detection rules: AMM / LP / protocol
  const ammLike = inferLikelyAmmOrLp({
    ownerAddress: owner,
    ownerAccountInfo,
    percent,
    tokenAccounts,
  });

  if (ammLike) {
    return {
      ownerAddress: owner,
      ...ammLike,
    };
  }

  // 4. Auto-detection rules: exchange / service wallet
  const exchangeLike = inferLikelyExchange({
    ownerAddress: owner,
    ownerAccountInfo,
    percent,
    tokenAccounts,
  });

  if (exchangeLike) {
    return {
      ownerAddress: owner,
      ...exchangeLike,
    };
  }

  // 5. Default: normal wallet
  return {
    ownerAddress: owner,
    label: "wallet",
    type: "wallet",
    exclude: false,
    confidence: isValidPubkey(owner) ? 0.9 : 0.4,
    reasons: ["default_wallet_classification"],
    source: "default",
  };
}

/**
 * Utility to determine whether the classifier thinks this should be excluded.
 * You can tune the threshold later.
 */
export function shouldExcludeClassifiedHolder(classification, threshold = 0.7) {
  if (!classification) return false;
  if (classification.exclude && safeNumber(classification.confidence, 0) >= threshold) {
    return true;
  }
  return false;
}