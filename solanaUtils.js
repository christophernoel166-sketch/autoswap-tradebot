// solanaUtils.js
// Solana helper utilities
//
// IMPORTANT:
// - No Solana connection is created at import time.
// - Jupiter is used for quote + transaction construction.
// - Confirmed on-chain transaction metadata is used for
//   actual execution accounting.
// - Quote values are NEVER treated as final execution values.

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  createJupiterApiClient,
} from "@jup-ag/api";

import { config } from "./config.js";

// =====================================================
// CONSTANTS
// =====================================================

const SOL_MINT =
  "So11111111111111111111111111111111111111112";

const DEFAULT_SLIPPAGE_BPS =
  config.solana.slippageBps ?? 200;

const sleep =
  (ms) =>
    new Promise((resolve) =>
      setTimeout(resolve, ms)
    );

// =====================================================
// LAZY SOLANA CONNECTION
// =====================================================

let _connection = null;

function getConnection() {

  if (_connection) {
    return _connection;
  }

  const rpcUrl =
    config.solana.rpcUrl;

  if (!rpcUrl) {
    throw new Error(
      "❌ Solana RPC URL is missing"
    );
  }

  if (
    !rpcUrl.startsWith("http://") &&
    !rpcUrl.startsWith("https://")
  ) {
    throw new Error(
      `❌ Invalid Solana RPC URL: ${rpcUrl}`
    );
  }

  _connection =
    new Connection(
      rpcUrl,
      "confirmed"
    );

  return _connection;
}

// =====================================================
// JUPITER CLIENT
// =====================================================

const jupiter =
  createJupiterApiClient({
    baseUrl:
      "https://quote-api.jup.ag/v6",

    defaultHeaders: {
      "x-api-user": "mainnet",
    },
  });

// =====================================================
// DIAGNOSTIC LOGGING
// =====================================================

function logWithTrace(
  level,
  ctx,
  msg,
  extra = {}
) {

  const traceId =
    ctx?.traceId;

  const payload =
    traceId
      ? {
          traceId,
          ...extra,
        }
      : extra;

  if (level === "error") {

    console.error(
      msg,
      payload
    );

  } else if (level === "warn") {

    console.warn(
      msg,
      payload
    );

  } else {

    console.log(
      msg,
      payload
    );

  }

}

// =====================================================
// SAFE BIGINT
// =====================================================

function toBigInt(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0n;
  }

  try {

    return BigInt(
      String(value)
    );

  } catch {

    return 0n;

  }

}

// =====================================================
// RAW TOKEN → HUMAN TOKEN AMOUNT
// =====================================================

function rawToUiAmount(
  rawAmount,
  decimals = 0
) {

  const raw =
    toBigInt(
      rawAmount
    );

  const negative =
    raw < 0n;

  const absolute =
    negative
      ? -raw
      : raw;

  if (
    decimals <= 0
  ) {

    return (
      negative
        ? "-"
        : ""
    ) +
      absolute.toString();

  }

  const divisor =
    10n **
    BigInt(decimals);

  const whole =
    absolute /
    divisor;

  const fraction =
    (
      absolute %
      divisor
    )
      .toString()
      .padStart(
        decimals,
        "0"
      );

  const trimmedFraction =
    fraction
      .replace(
        /0+$/,
        ""
      );

  const result =
    trimmedFraction
      ? `${whole}.${trimmedFraction}`
      : whole.toString();

  return (
    negative
      ? "-"
      : ""
  ) + result;
}

// =====================================================
// SAFE NUMBER FROM BIGINT
// =====================================================

function bigintToNumber(
  value
) {

  return Number(
    value
  );

}

// =====================================================
// EXTRACT HTTP DETAILS
// =====================================================

async function extractHttpDetails(
  err
) {

  const out = {

    status:
      undefined,

    retryAfter:
      undefined,

    message:
      err?.message,

    name:
      err?.name,

  };

  out.status =
    err?.status ??
    err?.response?.status ??
    err?.cause?.status ??
    err?.cause?.response?.status;

  out.retryAfter =
    err?.response
      ?.headers
      ?.get?.(
        "retry-after"
      ) ??
    err?.cause
      ?.response
      ?.headers
      ?.get?.(
        "retry-after"
      ) ??
    err?.headers
      ?.get?.(
        "retry-after"
      );

  try {

    const response =
      err?.response ??
      err?.cause?.response;

    if (
      response?.clone &&
      response?.text
    ) {

      const cloned =
        response.clone();

      out.bodyText =
        await cloned.text();

    }

  } catch {
    // Ignore diagnostic failure.
  }

  out.data =
    err?.data ??
    err?.response?.data ??
    err?.cause?.data;

  return out;
}

// =====================================================
// JUPITER CALL WRAPPER
// =====================================================

async function jupiterCall(
  label,
  fn,
  ctx
) {

  const startedAt =
    Date.now();

  try {

    const result =
      await fn();

    logWithTrace(
      "log",
      ctx,
      `🧪 Jupiter OK: ${label}`,
      {
        ms:
          Date.now() -
          startedAt,
      }
    );

    return result;

  } catch (err) {

    const http =
      await extractHttpDetails(
        err
      );

    logWithTrace(
      "error",
      ctx,
      `🧪 Jupiter FAIL: ${label}`,
      {

        ms:
          Date.now() -
          startedAt,

        status:
          http.status,

        retryAfter:
          http.retryAfter,

        name:
          http.name,

        message:
          http.message,

        bodyPreview:
          typeof http.bodyText ===
          "string"
            ? http.bodyText.slice(
                0,
                300
              )
            : undefined,

        hasData:
          !!http.data,

      }
    );

    throw err;
  }
}

// =====================================================
// GET QUOTE
// =====================================================

export async function getQuote(
  inputMint,
  outputMint,
  amountLamports,
  slippageBps =
    DEFAULT_SLIPPAGE_BPS,
  ctx = undefined
) {

  try {

    return await jupiterCall(
      "quoteGet",

      () =>
        jupiter.quoteGet({

          inputMint,

          outputMint,

          amount:
            typeof amountLamports ===
            "bigint"
              ? amountLamports.toString()
              : String(
                  amountLamports
                ),

          slippageBps,

          // =================================================
          // MEV PROTECTION
          // =================================================

          restrictIntermediateTokens:
            true,

          onlyDirectRoutes:
            true,

        }),

      ctx
    );

  } catch (err) {

    console.error(
      "[getQuote] Error:",
      err?.message ??
        err
    );

    return null;
  }
}

// =====================================================
// BUY QUOTE
// =====================================================

export async function getBuyQuote({
  mint,
  solAmount,
  slippageBps =
    DEFAULT_SLIPPAGE_BPS,
  ctx = undefined,
}) {

  const lamports =
    Math.floor(
      Number(solAmount) *
        LAMPORTS_PER_SOL
    );

  return getQuote(

    SOL_MINT,

    mint,

    lamports,

    slippageBps,

    ctx

  );
}

// =====================================================
// GET MESSAGE ACCOUNT KEYS
// =====================================================

function getTransactionAccountKeys(
  transaction
) {

  const message =
    transaction
      ?.transaction
      ?.message;

  if (!message) {
    return [];
  }

  const keys =
    message.staticAccountKeys ??
    message.accountKeys ??
    [];

  return keys.map(
    (key) => {

      if (
        typeof key ===
        "string"
      ) {

        return key;

      }

      if (
        key?.pubkey
      ) {

        if (
          typeof key.pubkey ===
          "string"
        ) {

          return key.pubkey;

        }

        if (
          key.pubkey.toBase58
        ) {

          return key.pubkey
            .toBase58();

        }

      }

      if (
        key?.toBase58
      ) {

        return key.toBase58();

      }

      return null;

    }
  );
}

// =====================================================
// FIND WALLET ACCOUNT INDEX
// =====================================================

function findWalletAccountIndex(
  transaction,
  walletAddress
) {

  const keys =
    getTransactionAccountKeys(
      transaction
    );

  const index =
    keys.findIndex(
      (key) =>
        key ===
        walletAddress
    );

  return index >= 0
    ? index
    : null;
}

// =====================================================
// TOKEN BALANCE SUM
// =====================================================

function getTokenBalanceForWallet(
  balances,
  mint,
  walletAddress
) {

  if (
    !Array.isArray(
      balances
    )
  ) {

    return {
      raw: 0n,
      decimals: 0,
    };

  }

  let totalRaw =
    0n;

  let decimals =
    0;

  for (
    const balance of
    balances
  ) {

    if (
      balance?.mint !==
      mint
    ) {
      continue;
    }

    const ownerMatches =
      balance?.owner ===
      walletAddress;

    if (
      ownerMatches
    ) {

      totalRaw +=
        toBigInt(
          balance
            ?.uiTokenAmount
            ?.amount
        );

      decimals =
        Number(
          balance
            ?.uiTokenAmount
            ?.decimals ??
          decimals
        );

      continue;
    }

    // =================================================
    // FALLBACK
    // =================================================
    //
    // Some RPC responses may omit owner.
    // accountIndex allows us to identify the
    // wallet-owned token account from the transaction.
    //

    if (
      balance?.owner ===
      undefined &&
      balance?.accountIndex !==
        undefined
    ) {

      const accountKeys =
        getTransactionAccountKeys(
          {
            transaction: {
              message: {
                accountKeys:
                  [],
              },
            },
          }
        );

      // Owner-less balances are handled separately
      // by the transaction-level helper below.
      void accountKeys;

    }

  }

  return {
    raw:
      totalRaw,

    decimals,
  };
}

// =====================================================
// GET TOKEN BALANCE USING ACCOUNT INDEX FALLBACK
// =====================================================

function getTokenBalanceFromTransaction(
  transaction,
  balances,
  mint,
  walletAddress
) {

  if (
    !Array.isArray(
      balances
    )
  ) {

    return {
      raw: 0n,
      decimals: 0,
    };

  }

  let totalRaw =
    0n;

  let decimals =
    0;

  const accountKeys =
    getTransactionAccountKeys(
      transaction
    );

  for (
    const balance of
    balances
  ) {

    if (
      balance?.mint !==
      mint
    ) {
      continue;
    }

    const amount =
      toBigInt(
        balance
          ?.uiTokenAmount
          ?.amount
      );

    const balanceDecimals =
      Number(
        balance
          ?.uiTokenAmount
          ?.decimals ??
        0
      );

    decimals =
      balanceDecimals ||
      decimals;

    // =================================================
    // OWNER AVAILABLE
    // =================================================

    if (
      balance?.owner ===
      walletAddress
    ) {

      totalRaw +=
        amount;

      continue;
    }

    // =================================================
    // OWNER NOT AVAILABLE
    // =================================================

    if (
      !balance?.owner &&
      balance?.accountIndex !==
        undefined
    ) {

      const accountKey =
        accountKeys[
          Number(
            balance.accountIndex
          )
        ];

      if (
        accountKey ===
        walletAddress
      ) {

        totalRaw +=
          amount;

      }

    }

  }

  return {
    raw:
      totalRaw,

    decimals,
  };
}

// =====================================================
// FETCH CONFIRMED TRANSACTION
// =====================================================

async function fetchTransactionWithRetry(
  connection,
  txid,
  ctx,
  attempts = 4
) {

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {

    try {

      const tx =
        await connection.getTransaction(
          txid,
          {
            maxSupportedTransactionVersion:
              1,

            commitment:
              "confirmed",
          }
        );

      if (tx) {

        return tx;

      }

      logWithTrace(
        "warn",
        ctx,
        "⚠️ Transaction metadata not available yet",
        {
          txid,
          attempt,
          attempts,
        }
      );

    } catch (err) {

      logWithTrace(
        "warn",
        ctx,
        "⚠️ Failed to fetch transaction metadata",
        {
          txid,
          attempt,
          attempts,
          message:
            err?.message,
        }
      );

    }

    if (
      attempt <
      attempts
    ) {

      await sleep(
        1000 *
        attempt
      );

    }

  }

  return null;
}

// =====================================================
// EXTRACT ACTUAL EXECUTION
// =====================================================
//
// This is the critical accounting function.
//
// Jupiter quote = expectation.
// Solana transaction metadata = authority.
//
// =====================================================

async function extractActualExecution({
  connection,
  txid,
  wallet,
  quote,
  ctx,
}) {

  const transaction =
    await fetchTransactionWithRetry(
      connection,
      txid,
      ctx
    );

  if (!transaction) {

    throw new Error(
      "Transaction confirmed but transaction metadata could not be retrieved."
    );

  }

  const meta =
    transaction?.meta;

  if (!meta) {

    throw new Error(
      "Transaction confirmed but transaction metadata is unavailable."
    );

  }

  if (meta.err) {

    throw new Error(
      "Transaction contains an on-chain error."
    );

  }

  const walletAddress =
    wallet?.publicKey?.toBase58?.();

  if (!walletAddress) {

    throw new Error(
      "Wallet public key is unavailable."
    );

  }

  const inputMint =
    quote?.inputMint;

  const outputMint =
    quote?.outputMint;

  const inputIsSol =
    inputMint ===
    SOL_MINT;

  const outputIsSol =
    outputMint ===
    SOL_MINT;

  // ===================================================
  // TRANSACTION FEE
  // ===================================================

  const feeLamports =
    toBigInt(
      meta.fee
    );

  // ===================================================
  // NATIVE SOL BALANCE
  // ===================================================

  const walletIndex =
    findWalletAccountIndex(
      transaction,
      walletAddress
    );

  let nativePre =
    0n;

  let nativePost =
    0n;

  if (
    walletIndex !==
    null
  ) {

    nativePre =
      toBigInt(
        meta.preBalances?.[
          walletIndex
        ]
      );

    nativePost =
      toBigInt(
        meta.postBalances?.[
          walletIndex
        ]
      );

  }

  const nativeDelta =
    nativePost -
    nativePre;

  // ===================================================
  // ACTUAL TOKEN BALANCES
  // ===================================================

  const preToken =
    getTokenBalanceFromTransaction(
      transaction,
      meta.preTokenBalances,
      inputMint,
      walletAddress
    );

  const postToken =
    getTokenBalanceFromTransaction(
      transaction,
      meta.postTokenBalances,
      inputMint,
      walletAddress
    );

  const outputPreToken =
    getTokenBalanceFromTransaction(
      transaction,
      meta.preTokenBalances,
      outputMint,
      walletAddress
    );

  const outputPostToken =
    getTokenBalanceFromTransaction(
      transaction,
      meta.postTokenBalances,
      outputMint,
      walletAddress
    );

  // ===================================================
  // ACTUAL INPUT TOKEN AMOUNT
  // ===================================================

  let actualInputTokenRaw =
    0n;

  let inputTokenDecimals =
    preToken.decimals ||
    postToken.decimals ||
    0;

  if (
    !inputIsSol &&
    inputMint
  ) {

    actualInputTokenRaw =
      preToken.raw >
      postToken.raw
        ? preToken.raw -
          postToken.raw
        : 0n;

  }

  // ===================================================
  // ACTUAL OUTPUT TOKEN AMOUNT
  // ===================================================

  let actualOutputTokenRaw =
    0n;

  let outputTokenDecimals =
    outputPreToken.decimals ||
    outputPostToken.decimals ||
    0;

  if (
    !outputIsSol &&
    outputMint
  ) {

    actualOutputTokenRaw =
      outputPostToken.raw >
      outputPreToken.raw
        ? outputPostToken.raw -
          outputPreToken.raw
        : 0n;

  }

  // ===================================================
  // ACTUAL SOL SPENT
  // ===================================================

  let actualSolSpentLamports =
    0n;

  if (
    inputIsSol
  ) {

    // Wallet decrease = swap input + transaction fee.
    // Add fee back to obtain the gross SOL used by
    // the swap itself.

    const grossSpent =
      nativePre -
      nativePost +
      feeLamports;

    actualSolSpentLamports =
      grossSpent > 0n
        ? grossSpent
        : 0n;

  }

  // ===================================================
  // ACTUAL SOL RECEIVED
  // ===================================================

  let actualSolReceivedLamports =
    0n;

  if (
    outputIsSol
  ) {

    // Wallet increase = SOL received - tx fee.
    // Add fee back to recover gross swap output.

    const grossReceived =
      nativePost -
      nativePre +
      feeLamports;

    actualSolReceivedLamports =
      grossReceived > 0n
        ? grossReceived
        : 0n;

  }

  // ===================================================
  // HUMAN-READABLE VALUES
  // ===================================================

  const actualInputToken =
    rawToUiAmount(
      actualInputTokenRaw,
      inputTokenDecimals
    );

  const actualOutputToken =
    rawToUiAmount(
      actualOutputTokenRaw,
      outputTokenDecimals
    );

  const actualSolSpent =
    bigintToNumber(
      actualSolSpentLamports
    ) /
    LAMPORTS_PER_SOL;

  const actualSolReceived =
    bigintToNumber(
      actualSolReceivedLamports
    ) /
    LAMPORTS_PER_SOL;

  const transactionFeeSol =
    bigintToNumber(
      feeLamports
    ) /
    LAMPORTS_PER_SOL;

  // ===================================================
  // ACTUAL EXECUTION PRICE
  // ===================================================

  let executionPriceSolPerToken =
    null;

  // SELL:
  //
  // SOL received / tokens sold
  //

  if (
    !inputIsSol &&
    outputIsSol &&
    actualInputTokenRaw > 0n
  ) {

    const tokenAmount =
      Number(
        actualInputToken
      );

    if (
      Number.isFinite(
        tokenAmount
      ) &&
      tokenAmount > 0
    ) {

      executionPriceSolPerToken =
        actualSolReceived /
        tokenAmount;

    }

  }

  // BUY:
  //
  // SOL spent / tokens received
  //

  if (
    inputIsSol &&
    !outputIsSol &&
    actualOutputTokenRaw > 0n
  ) {

    const tokenAmount =
      Number(
        actualOutputToken
      );

    if (
      Number.isFinite(
        tokenAmount
      ) &&
      tokenAmount > 0
    ) {

      executionPriceSolPerToken =
        actualSolSpent /
        tokenAmount;

    }

  }

  // ===================================================
  // QUOTE VALUES
  // ===================================================

  const quotedInputRaw =
    toBigInt(
      quote?.inAmount
    );

  const quotedOutputRaw =
    toBigInt(
      quote?.outAmount
    );

  const quotedInputToken =
    !inputIsSol
      ? rawToUiAmount(
          quotedInputRaw,
          inputTokenDecimals
        )
      : null;

  const quotedOutputToken =
    !outputIsSol
      ? rawToUiAmount(
          quotedOutputRaw,
          outputTokenDecimals
        )
      : null;

  const quotedSolOut =
    outputIsSol
      ? Number(
          quotedOutputRaw
        ) /
        LAMPORTS_PER_SOL
      : null;

  const quotedSolIn =
    inputIsSol
      ? Number(
          quotedInputRaw
        ) /
        LAMPORTS_PER_SOL
      : null;

  logWithTrace(
    "log",
    ctx,
    "✅ ACTUAL ON-CHAIN EXECUTION",
    {

      txid,

      wallet:
        walletAddress,

      inputMint,

      outputMint,

      actualInputTokenRaw:
        actualInputTokenRaw.toString(),

      actualInputToken,

      actualOutputTokenRaw:
        actualOutputTokenRaw.toString(),

      actualOutputToken,

      actualSolSpent,

      actualSolReceived,

      transactionFeeSol,

      executionPriceSolPerToken,

      quotedInputRaw:
        quotedInputRaw.toString(),

      quotedOutputRaw:
        quotedOutputRaw.toString(),

      quotedInputToken,

      quotedOutputToken,

      quotedSolIn,

      quotedSolOut,

    }
  );

  return {

    txid,

    confirmed:
      true,

    // =================================================
    // TOKEN INPUT
    // =================================================

    inputMint,

    inputTokenAmountRaw:
      actualInputTokenRaw.toString(),

    inputTokenAmount:
      actualInputToken,

    inputTokenDecimals,

    // =================================================
    // TOKEN OUTPUT
    // =================================================

    outputMint,

    outputTokenAmountRaw:
      actualOutputTokenRaw.toString(),

    outputTokenAmount:
      actualOutputToken,

    outputTokenDecimals,

    // =================================================
    // SOL ACCOUNTING
    // =================================================

    actualSolSpent,

    actualSolSpentLamports:
      actualSolSpentLamports.toString(),

    actualSolReceived,

    actualSolReceivedLamports:
      actualSolReceivedLamports.toString(),

    transactionFeeSol,

    transactionFeeLamports:
      feeLamports.toString(),

    // =================================================
    // EXECUTION PRICE
    // =================================================

    executionPriceSolPerToken,

    // =================================================
    // QUOTE FOR COMPARISON ONLY
    // =================================================

    quote: {

      inputRaw:
        quotedInputRaw.toString(),

      outputRaw:
        quotedOutputRaw.toString(),

      inputToken:
        quotedInputToken,

      outputToken:
        quotedOutputToken,

      solIn:
        quotedSolIn,

      solOut:
        quotedSolOut,

    },

  };
}

// =====================================================
// EXECUTE SWAP
// =====================================================

export async function executeSwap(
  wallet,
  quote,
  ctx = undefined
) {

  try {

    const connection =
      getConnection();

    if (!wallet?.publicKey) {

      throw new Error(
        "Wallet public key is required."
      );

    }

    if (!quote) {

      throw new Error(
        "Jupiter quote is required."
      );

    }

    logWithTrace(
      "log",
      ctx,
      "🧪 executeSwap: start",
      {

        wallet:
          wallet.publicKey.toBase58(),

        hasQuote:
          !!quote,

        inputMint:
          quote?.inputMint,

        outputMint:
          quote?.outputMint,

        inAmount:
          quote?.inAmount,

        outAmount:
          quote?.outAmount,

        routePlan:
          quote?.routePlan?.length ??
          0,

      }
    );

    // =================================================
    // REQUEST SWAP TRANSACTION
    // =================================================

    const swapRes =
      await jupiterCall(

        "swapPost",

        () =>
          jupiter.swapPost({

            swapRequest: {

              quoteResponse:
                quote,

              userPublicKey:
                wallet
                  .publicKey
                  .toBase58(),

              wrapAndUnwrapSol:
                true,

              // =================================================
              // MEV PROTECTION
              // =================================================

              dynamicComputeUnitLimit:
                true,

              asLegacyTransaction:
                false,

              prioritizationFeeLamports: {

                priorityLevelWithMaxLamports: {

                  priorityLevel:
                    "veryHigh",

                  maxLamports:
                    1_500_000,

                },

              },

            },

          }),

        ctx

      );

    if (
      !swapRes?.swapTransaction
    ) {

      throw new Error(
        "No swap transaction returned from Jupiter"
      );

    }

    // =================================================
    // DESERIALIZE
    // =================================================

    const txBuffer =
      Buffer.from(
        swapRes.swapTransaction,
        "base64"
      );

    const transaction =
      VersionedTransaction.deserialize(
        txBuffer
      );

    // =================================================
    // SIGN
    // =================================================

    transaction.sign([
      wallet,
    ]);

    // =================================================
    // SEND
    // =================================================

    logWithTrace(
      "log",
      ctx,
      "🧪 executeSwap: sending transaction",
      {
        skipPreflight:
          true,
      }
    );

    const txid =
      await connection.sendTransaction(
        transaction,
        {
          skipPreflight:
            true,
        }
      );

    logWithTrace(
      "log",
      ctx,
      "🧪 executeSwap: tx sent",
      {
        txid,
      }
    );

    // =================================================
    // CONFIRM
    // =================================================

    let confirmation;

    try {

      confirmation =
        await connection.confirmTransaction(
          txid,
          "confirmed"
        );

    } catch (err) {

      logWithTrace(
        "warn",
        ctx,
        "⚠️ Confirmation timeout — checking actual chain status",
        {

          txid,

          message:
            err?.message,

        }
      );

      await sleep(
        5000
      );

      const retryStatus =
        await connection.getSignatureStatuses(
          [txid],
          {
            searchTransactionHistory:
              true,
          }
        );

      const signature =
        retryStatus
          ?.value?.[0];

      if (
        signature &&
        (
          signature.confirmationStatus ===
            "confirmed" ||
          signature.confirmationStatus ===
            "finalized"
        ) &&
        !signature.err
      ) {

        logWithTrace(
          "warn",
          ctx,
          "✅ Transaction actually landed after timeout",
          {
            txid,
          }
        );

        confirmation = {

          value: {
            err: null,
          },

        };

      } else {

        throw err;

      }

    }

    // =================================================
    // SIGNATURE STATUS
    // =================================================

    const signatureStatus =
      await connection.getSignatureStatuses(
        [txid],
        {
          searchTransactionHistory:
            true,
        }
      );

    const status =
      signatureStatus
        ?.value?.[0];

    const confirmationError =
      confirmation
        ?.value?.err ??
      null;

    const statusError =
      status?.err ??
      null;

    logWithTrace(
      "log",
      ctx,
      "🧪 SWAP CONFIRM RESULT",
      {

        txid,

        confirmationError,

        statusError,

        confirmationStatus:
          status?.confirmationStatus,

      }
    );

    // =================================================
    // FAILED TRANSACTION
    // =================================================

    if (
      confirmationError ||
      statusError
    ) {

      logWithTrace(
        "error",
        ctx,
        "❌ SWAP FAILED",
        {

          txid,

          confirmationError,

          statusError,

          confirmationStatus:
            status?.confirmationStatus,

          slot:
            status?.slot,

        }
      );

      try {

        const txInfo =
          await connection.getTransaction(
            txid,
            {
              maxSupportedTransactionVersion:
                1,

              commitment:
                "confirmed",
            }
          );

        logWithTrace(
          "error",
          ctx,
          "❌ SWAP TX META ERR",
          {
            err:
              txInfo
                ?.meta
                ?.err ??
              null,
          }
        );

        const logs =
          txInfo
            ?.meta
            ?.logMessages ??
          [];

        logWithTrace(
          "error",
          ctx,
          "❌ SWAP TX LOGS",
          {
            logsTail:
              logs.slice(
                -30
              ),
          }
        );

      } catch (err) {

        logWithTrace(
          "error",
          ctx,
          "❌ Failed to fetch failed swap transaction",
          {
            message:
              err?.message,
          }
        );

      }

      throw new Error(
        "Swap transaction confirmed with error."
      );

    }

    // =================================================
    // IMPORTANT:
    //
    // Now read the actual blockchain transaction.
    // =================================================

    const execution =
      await extractActualExecution({

        connection,

        txid,

        wallet,

        quote,

        ctx,

      });

    // =================================================
    // BACKWARD-COMPATIBLE RETURN
    // =================================================
    //
    // tokenAmount remains RAW for BUY compatibility.
    //
    // The new authoritative values are:
    //
    // actualInputTokenAmount
    // actualOutputTokenAmount
    // actualSolSpent
    // actualSolReceived
    // executionPriceSolPerToken
    //
    // =================================================

    return {

      txid,

      tokenAmount:
        quote?.outAmount
          ? Number(
              quote.outAmount
            )
          : 0,

      // =================================================
      // ACTUAL EXECUTION
      // =================================================

      confirmed:
        execution.confirmed,

      inputMint:
        execution.inputMint,

      outputMint:
        execution.outputMint,

      actualInputTokenAmountRaw:
        execution
          .inputTokenAmountRaw,

      actualInputTokenAmount:
        execution
          .inputTokenAmount,

      actualInputTokenDecimals:
        execution
          .inputTokenDecimals,

      actualOutputTokenAmountRaw:
        execution
          .outputTokenAmountRaw,

      actualOutputTokenAmount:
        execution
          .outputTokenAmount,

      actualOutputTokenDecimals:
        execution
          .outputTokenDecimals,

      actualSolSpent:
        execution.actualSolSpent,

      actualSolReceived:
        execution.actualSolReceived,

      transactionFeeSol:
        execution
          .transactionFeeSol,

      executionPriceSolPerToken:
        execution
          .executionPriceSolPerToken,

      // =================================================
      // QUOTE
      // =================================================

      quote:
        execution.quote,

    };

  } catch (err) {

    console.error(
      "[executeSwap] Error:",
      err?.message ??
        err
    );

    throw err;
  }
}

// =====================================================
// CURRENT PRICE
// =====================================================
//
// READ-ONLY.
//
// Kept for compatibility with existing callers.
// =====================================================

export async function getCurrentPrice(
  mintAddress,
  ctx = undefined
) {

  try {

    const quote =
      await jupiterCall(

        "quoteGet(price)",

        () =>
          jupiter.quoteGet({

            inputMint:
              SOL_MINT,

            outputMint:
              mintAddress,

            amount:
              LAMPORTS_PER_SOL,

          }),

        ctx

      );

    if (
      !quote?.outAmount
    ) {

      return null;

    }

    return (
      1 /
      (
        Number(
          quote.outAmount
        ) /
        LAMPORTS_PER_SOL
      )
    );

  } catch (err) {

    console.error(
      "[getCurrentPrice] Error:",
      err?.message ??
        err
    );

    return null;

  }

}

// =====================================================
// SELL PARTIAL
// =====================================================

export async function sellPartial(
  wallet,
  mint,
  percent,
  slippageBps =
    DEFAULT_SLIPPAGE_BPS,
  ctx = undefined
) {

  const connection =
    getConnection();

  const numericPercent =
    Number(percent);

  if (
    !Number.isFinite(
      numericPercent
    ) ||
    numericPercent <= 0 ||
    numericPercent > 100
  ) {

    throw new Error(
      `Invalid sell percentage: ${percent}`
    );

  }

  logWithTrace(
    "log",
    ctx,
    "🧪 sellPartial: start",
    {

      wallet:
        wallet
          ?.publicKey
          ?.toBase58?.(),

      mint,

      percent:
        numericPercent,

      slippageBps,

    }
  );

  // =================================================
  // TOKEN ACCOUNTS
  // =================================================

  const accounts =
    await connection.getTokenAccountsByOwner(
      wallet.publicKey,
      {
        mint:
          new PublicKey(
            mint
          ),
      }
    );

  if (
    !accounts?.value?.length
  ) {

    throw new Error(
      "No token account found"
    );

  }

  // =================================================
  // FIND TOTAL BALANCE
  // =================================================
  //
  // Important:
  // A wallet can have more than one token account.
  // We sum them rather than assuming accounts[0].
  //
  // =================================================

  let totalRaw =
    0n;

  let decimals =
    0;

  for (
    const account of
    accounts.value
  ) {

    const balance =
      await connection.getTokenAccountBalance(
        account.pubkey
      );

    totalRaw +=
      toBigInt(
        balance
          ?.value
          ?.amount
      );

    decimals =
      Number(
        balance
          ?.value
          ?.decimals ??
        decimals
      );

  }

  if (
    totalRaw <= 0n
  ) {

    throw new Error(
      "Nothing to sell"
    );

  }

  // =================================================
  // CALCULATE EXACT RAW SELL AMOUNT
  // =================================================

  const percentNumerator =
    BigInt(
      Math.round(
        numericPercent *
          10000
      )
    );

  const amountRaw =
    (
      totalRaw *
      percentNumerator
    ) /
    1_000_000n;

  if (
    amountRaw <= 0n
  ) {

    throw new Error(
      "Nothing to sell"
    );

  }

  const humanSellAmount =
    rawToUiAmount(
      amountRaw,
      decimals
    );

  logWithTrace(
    "log",
    ctx,
    "🧪 sellPartial: computed sell amount",
    {

      amountRaw:
        amountRaw.toString(),

      decimals,

      tokenAmount:
        humanSellAmount,

      walletBalanceRaw:
        totalRaw.toString(),

      walletBalance:
        rawToUiAmount(
          totalRaw,
          decimals
        ),

    }
  );

  // =================================================
  // QUOTE
  // =================================================

  const quote =
    await getQuote(

      mint,

      SOL_MINT,

      amountRaw,

      slippageBps,

      ctx

    );

  if (
    !quote?.outAmount
  ) {

    throw new Error(
      "Invalid quote for partial sell"
    );

  }

  logWithTrace(
    "log",
    ctx,
    "🧪 sellPartial: quote received",
    {

      inputAmount:
        quote.inAmount,

      outputAmount:
        quote.outAmount,

      tokenAmount:
        humanSellAmount,

      decimals,

    }
  );

  // =================================================
  // EXECUTE
  // =================================================

  const execution =
    await executeSwap(
      wallet,
      quote,
      ctx
    );

  // =================================================
  // RETURN AUTHORITATIVE SELL RESULT
  // =================================================

  return {

    txid:
      execution.txid,

    // Human-readable actual tokens sold.
    tokenAmount:
      execution
        .actualInputTokenAmount,

    tokenAmountRaw:
      execution
        .actualInputTokenAmountRaw,

    tokenDecimals:
      execution
        .actualInputTokenDecimals,

    solReceived:
      execution
        .actualSolReceived,

    solReceivedLamports:
      String(
        Math.round(
          Number(
            execution
              .actualSolReceived
          ) *
          LAMPORTS_PER_SOL
        )
      ),

    executionPrice:
      execution
        .executionPriceSolPerToken,

    executionPriceSolPerToken:
      execution
        .executionPriceSolPerToken,

    transactionFeeSol:
      execution
        .transactionFeeSol,

    confirmed:
      execution.confirmed,

    // Keep quote available for diagnostics.
    quote:
      execution.quote,

  };

}

// =====================================================
// SELL ALL
// =====================================================

export async function sellAll(
  wallet,
  mint,
  slippageBps =
    DEFAULT_SLIPPAGE_BPS,
  ctx = undefined
) {

  const connection =
    getConnection();

  logWithTrace(
    "log",
    ctx,
    "🧪 sellAll: start",
    {

      wallet:
        wallet
          ?.publicKey
          ?.toBase58?.(),

      mint,

      slippageBps,

    }
  );

  // =================================================
  // TOKEN ACCOUNTS
  // =================================================

  const accounts =
    await connection.getTokenAccountsByOwner(
      wallet.publicKey,
      {
        mint:
          new PublicKey(
            mint
          ),
      }
    );

  if (
    !accounts?.value?.length
  ) {

    throw new Error(
      "No token account found"
    );

  }

  // =================================================
  // SUM ALL TOKEN ACCOUNTS
  // =================================================

  let totalRaw =
    0n;

  let decimals =
    0;

  for (
    const account of
    accounts.value
  ) {

    const balance =
      await connection.getTokenAccountBalance(
        account.pubkey
      );

    totalRaw +=
      toBigInt(
        balance
          ?.value
          ?.amount
      );

    decimals =
      Number(
        balance
          ?.value
          ?.decimals ??
        decimals
      );

  }

  if (
    totalRaw <= 0n
  ) {

    throw new Error(
      "No balance to sell"
    );

  }

  const humanSellAmount =
    rawToUiAmount(
      totalRaw,
      decimals
    );

  logWithTrace(
    "log",
    ctx,
    "🧪 sellAll: balance",
    {

      amountRaw:
        totalRaw.toString(),

      decimals,

      tokenAmount:
        humanSellAmount,

    }
  );

  // =================================================
  // QUOTE
  // =================================================

  const quote =
    await getQuote(

      mint,

      SOL_MINT,

      totalRaw,

      slippageBps,

      ctx

    );

  if (
    !quote?.outAmount
  ) {

    throw new Error(
      "Invalid quote for sell all"
    );

  }

  logWithTrace(
    "log",
    ctx,
    "🧪 sellAll: quote received",
    {

      inputAmount:
        quote.inAmount,

      outputAmount:
        quote.outAmount,

      tokenAmount:
        humanSellAmount,

      decimals,

    }
  );

  // =================================================
  // EXECUTE
  // =================================================

  const execution =
    await executeSwap(
      wallet,
      quote,
      ctx
    );

  // =================================================
  // RETURN AUTHORITATIVE SELL RESULT
  // =================================================

  return {

    txid:
      execution.txid,

    // Human-readable actual tokens sold.
    tokenAmount:
      execution
        .actualInputTokenAmount,

    tokenAmountRaw:
      execution
        .actualInputTokenAmountRaw,

    tokenDecimals:
      execution
        .actualInputTokenDecimals,

    solReceived:
      execution
        .actualSolReceived,

    solReceivedLamports:
      String(
        Math.round(
          Number(
            execution
              .actualSolReceived
          ) *
          LAMPORTS_PER_SOL
        )
      ),

    executionPrice:
      execution
        .executionPriceSolPerToken,

    executionPriceSolPerToken:
      execution
        .executionPriceSolPerToken,

    transactionFeeSol:
      execution
        .transactionFeeSol,

    confirmed:
      execution.confirmed,

    quote:
      execution.quote,

  };

}