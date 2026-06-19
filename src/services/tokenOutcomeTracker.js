import TokenOutcome from "../../models/TokenOutcome.js";
import { fetchTokenMarketData } from "../scanner/fetchTokenMarketData.js";

// =====================================================
// DEVELOPMENT MODE
// Final outcome is evaluated after 3 hours instead of
// 24 hours for faster AI learning.
// Later you can switch THREE_HOURS back to 24 hours.
// =====================================================

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const THREE_HOURS = 3 * 60 * 60 * 1000;

const BATCH_SIZE = 50;
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

function determineLabel(returnValue) {
  if (!Number.isFinite(returnValue)) {
    return "PENDING";
  }

  if (returnValue >= 100) return "MOONSHOT";
  if (returnValue >= 30) return "WINNER";
  if (returnValue > -20) return "NEUTRAL";
  if (returnValue > -50) return "LOSER";

  return "RUG_OR_FAILURE";
}

export async function processTokenOutcomes() {
  const now = Date.now();

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
        console.log("❌ TRACKER SKIPPED", {
          mint: outcome.mintAddress,
          entryPrice: outcome.entryPriceUsd,
          currentPrice,
        });

        continue;
      }

      const ageMs =
        now - new Date(outcome.scannedAt).getTime();

      let updated = false;

      console.log("📈 Tracking", {
        mint: outcome.mintAddress,
        ageMinutes: Math.floor(ageMs / 60000),
        currentPrice,
      });

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

        console.log(
          `✅ Saved 15m checkpoint for ${outcome.mintAddress}`
        );
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

        console.log(
          `✅ Saved 1h checkpoint for ${outcome.mintAddress}`
        );
      }

      // ============================================
      // FINAL CHECKPOINT (3 HOURS)
      // ============================================
      if (
        outcome.price24h == null &&
        ageMs >= THREE_HOURS
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

        console.log(
          `🎯 Finalized tracking for ${outcome.mintAddress}`
        );

        console.log({
          return24h: outcome.return24h,
          label: outcome.label,
        });
      }

      if (updated) {
        await outcome.save();

        console.log(
          `💾 Outcome updated for ${outcome.mintAddress}`
        );
      }

      await sleep(REQUEST_DELAY_MS);
    } catch (err) {
      console.error(
        `❌ Outcome tracking failed for ${outcome.mintAddress}:`,
        err?.message || err
      );
    }
  }
}