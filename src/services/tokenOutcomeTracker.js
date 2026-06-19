import TokenOutcome from "../../models/TokenOutcome.js";
import { fetchTokenMarketData } from "../scanner/fetchTokenMarketData.js";

// =====================================================
// DEVELOPMENT MODE
// Final outcome is evaluated after 3 hours instead of
// 24 hours for faster AI learning.
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

// =====================================================
// Label based on BEST observed return, not final return
// =====================================================

function determineLabelFromPeak(peakReturn, finalReturn) {
  if (!Number.isFinite(peakReturn)) {
    return "PENDING";
  }

  if (peakReturn >= 200) {
    return "MOONSHOT";
  }

  if (peakReturn >= 50) {
    return "WINNER";
  }

  if (
    Number.isFinite(finalReturn) &&
    finalReturn <= -80
  ) {
    return "RUG_OR_FAILURE";
  }

  if (peakReturn >= 10) {
    return "NEUTRAL";
  }

  return "LOSER";
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

        const observedReturns = [
          outcome.return15m,
          outcome.return1h,
          outcome.return6h,
          outcome.return24h,
        ].filter(Number.isFinite);

        const peakReturn =
          observedReturns.length > 0
            ? Math.max(...observedReturns)
            : null;

        outcome.peakReturn = peakReturn;

        if (peakReturn === outcome.return15m) {
          outcome.peakCheckpoint = "15m";
        } else if (peakReturn === outcome.return1h) {
          outcome.peakCheckpoint = "1h";
        } else if (peakReturn === outcome.return6h) {
          outcome.peakCheckpoint = "6h";
        } else {
          outcome.peakCheckpoint = "3h";
        }

        outcome.label = determineLabelFromPeak(
          peakReturn,
          outcome.return24h
        );

        outcome.trackingComplete = true;

        updated = true;

        console.log(
          `🎯 Finalized tracking for ${outcome.mintAddress}`
        );

        console.log({
          peakReturn,
          peakCheckpoint:
            outcome.peakCheckpoint,
          finalReturn:
            outcome.return24h,
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