/**
 * ============================================================
 * AUTOMATIC TOKEN SCAN WORKER
 * ============================================================
 *
 * Responsibilities:
 * 1. Find discovered tokens waiting for automatic scanning.
 * 2. Claim a token before scanning it.
 * 3. Run the existing scanToken() pipeline.
 * 4. Store the resulting recommendation.
 * 5. Mark the token as SCANNED or FAILED.
 *
 * IMPORTANT:
 * This worker does NOT recreate the token scan logic.
 * It delegates the complete scan to tokenScanService.js.
 * ============================================================
 */

import DiscoveredToken from "../api/models/DiscoveredToken.js";
import { scanToken } from "./tokenScanService.js";

const AUTO_SCAN_INTERVAL_MS = 60 * 1000;
const AUTO_SCAN_BATCH_SIZE = 5;

let autoScanRunning = false;


// ============================================================
// RUN ONE AUTOMATIC SCAN CYCLE
// ============================================================

async function runAutomaticScanOnce() {
  if (autoScanRunning) {
    console.log("⏳ Automatic token scan already running, skipping...");
    return;
  }

  autoScanRunning = true;

  try {
    // --------------------------------------------------------
    // Find tokens waiting for automatic scanning
    // --------------------------------------------------------

    const tokens = await DiscoveredToken.find({
      autoScanStatus: "PENDING",
    })
      .sort({
        lastSeenAt: 1,
      })
      .limit(AUTO_SCAN_BATCH_SIZE)
      .lean();

    if (!tokens.length) {
      return;
    }

    console.log(
      `🤖 Automatic scan worker found ${tokens.length} pending token(s)`
    );


    // --------------------------------------------------------
    // Process tokens one at a time
    // --------------------------------------------------------

    for (const token of tokens) {
      const mintAddress = token?.mintAddress;

      if (!mintAddress) {
        continue;
      }

      try {
        // ----------------------------------------------------
        // Claim token
        // ----------------------------------------------------

        const claimedToken =
          await DiscoveredToken.findOneAndUpdate(
            {
              _id: token._id,
              autoScanStatus: "PENDING",
            },
            {
              $set: {
                autoScanStatus: "SCANNING",
              },
            },
            {
              new: true,
            }
          );

        // Another worker/process may have claimed it.
        if (!claimedToken) {
          continue;
        }

        console.log(
          `🔍 Automatic scan started: ${
            token.symbol || mintAddress
          }`
        );


        // ----------------------------------------------------
        // Run EXISTING scan pipeline
        // ----------------------------------------------------

        const result = await scanToken({
          tokenMint: mintAddress,
          mode: "AUTO",
        });


        // ----------------------------------------------------
        // Extract recommendation
        // ----------------------------------------------------

        const recommendation =
          result?.ai?.recommendation?.recommendation ??
          result?.ai?.recommendation?.action ??
          result?.ai?.recommendation?.decision ??
          result?.ai?.recommendation ??
          null;


        // ----------------------------------------------------
        // Mark token as successfully scanned
        // ----------------------------------------------------

        await DiscoveredToken.findOneAndUpdate(
          {
            _id: token._id,
          },
          {
            $set: {
              autoScanStatus: "SCANNED",
              lastAutoScanAt: new Date(),
              autoScanRecommendation:
                typeof recommendation === "string"
                  ? recommendation
                  : null,
            },
          }
        );

        console.log(
          `✅ Automatic scan completed: ${
            token.symbol || mintAddress
          }`,
          {
            recommendation,
          }
        );

      } catch (err) {

        // ----------------------------------------------------
        // Mark scan as failed
        // ----------------------------------------------------

        console.error(
          `❌ Automatic scan failed: ${
            token.symbol || mintAddress
          }`,
          err?.message || err
        );

        await DiscoveredToken.findOneAndUpdate(
          {
            _id: token._id,
          },
          {
            $set: {
              autoScanStatus: "FAILED",
              lastAutoScanAt: new Date(),
            },
          }
        );
      }
    }

  } catch (err) {

    console.error(
      "❌ Automatic scan worker failed:",
      err?.message || err
    );

  } finally {
    autoScanRunning = false;
  }
}


// ============================================================
// START WORKER
// ============================================================

export function startAutomaticScanWorker() {
  console.log("🤖 Automatic token scan worker started");

  // Run immediately after startup
  runAutomaticScanOnce();

  // Continue every 60 seconds
  setInterval(() => {
    runAutomaticScanOnce();
  }, AUTO_SCAN_INTERVAL_MS);
}