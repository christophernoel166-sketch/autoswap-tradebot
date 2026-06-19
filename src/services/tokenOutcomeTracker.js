import TokenOutcome from "../../models/TokenOutcome.js";
import { fetchTokenMarketData } from "../scanner/fetchTokenMarketData.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const SIX_HOURS = 6 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const BATCH_SIZE = 10;
const REQUEST_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateReturn(entryPrice, currentPrice) {
  if (
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0 ||
    !Number.isFinite(currentPrice)
  ) {
    return null;
  }

  return ((currentPrice - entryPrice) / entryPrice) * 100;
}

function determineLabel(return24h) {
  if (!Number.isFinite(return24h)) {
    return "PENDING";
  }

  if (return24h >= 100) return "MOONSHOT";
  if (return24h >= 30) return "WINNER";
  if (return24h > -20) return "NEUTRAL";
  if (return24h > -50) return "LOSER";

  return "RUG_OR_FAILURE";
}

export async function processTokenOutcomes() {
  const now = Date.now();

  // Only process records that are old enough for at least the
  // first checkpoint, oldest first, in small batches.
  const pending = await TokenOutcome.find({
    trackingComplete: false,
    scannedAt: {
      $lte: new Date(now - FIFTEEN_MINUTES),
    },
  })
    .sort({ scannedAt: 1 })
    .limit(BATCH_SIZE);

  for (const outcome of pending) {
    try {
      const market = await fetchTokenMarketData(
        outcome.mintAddress
      );

      const currentPrice = Number(
        market?.metrics?.priceUsd ?? 0
      );

      if (
        !Number.isFinite(currentPrice) ||
        currentPrice <= 0 ||
        !Number.isFinite(outcome.entryPriceUsd) ||
        outcome.entryPriceUsd <= 0
      ) {
        continue;
      }

      const ageMs =
        now - new Date(outcome.scannedAt).getTime();

      let updated = false;

      // ============================================
      // 15 MINUTES
      // ============================================
      if (
        outcome.price15m == null &&
        ageMs >= FIFTEEN_MINUTES
      ) {
        outcome.price15m = currentPrice;
        outcome.return15m = calculateReturn(
          outcome.entryPriceUsd,
          currentPrice
        );
        updated = true;
      }

      // ============================================
      // 1 HOUR
      // ============================================
      if (
        outcome.price1h == null &&
        ageMs >= ONE_HOUR
      ) {
        outcome.price1h = currentPrice;
        outcome.return1h = calculateReturn(
          outcome.entryPriceUsd,
          currentPrice
        );
        updated = true;
      }

      // ============================================
      // 6 HOURS
      // ============================================
      if (
        outcome.price6h == null &&
        ageMs >= SIX_HOURS
      ) {
        outcome.price6h = currentPrice;
        outcome.return6h = calculateReturn(
          outcome.entryPriceUsd,
          currentPrice
        );
        updated = true;
      }

      // ============================================
      // 24 HOURS
      // ============================================
      if (
        outcome.price24h == null &&
        ageMs >= TWENTY_FOUR_HOURS
      ) {
        outcome.price24h = currentPrice;
        outcome.return24h = calculateReturn(
          outcome.entryPriceUsd,
          currentPrice
        );

        outcome.label = determineLabel(
          outcome.return24h
        );

        outcome.trackingComplete = true;
        updated = true;
      }

      if (updated) {
        await outcome.save();
      }

      // Small pause to reduce API pressure
      await sleep(REQUEST_DELAY_MS);
    } catch (err) {
      console.error(
        `Outcome tracking failed for ${outcome.mintAddress}:`,
        err?.message || err
      );
    }
  }
}