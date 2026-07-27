import TokenOutcome from "../../../models/TokenOutcome.js";

import {
    fetchTokenMarketData,
} from "../market/fetchTokenMarketData.js";

import {
    buildSnapshot,
} from "./buildSnapshot.js";

import {
    saveOutcomeSnapshot,
} from "./snapshotService.js";

export async function lifecycleTrackingService() {

    console.log("🧠 Starting Lifecycle Tracker...");

    try {

        const activeTokens =
            await TokenOutcome.find({

                trackingComplete: false,

            });

        console.log(
            `📊 ${activeTokens.length} active token(s) found`
        );

        for (const token of activeTokens) {

            await trackTokenLifecycle(token);

        }

    } catch (error) {

        console.error(
            "❌ Lifecycle Tracker Error:",
            error
        );

    }

}

async function trackTokenLifecycle(token) {

    try {

        console.log(
            `📈 Tracking ${token.symbol} (${token.mintAddress})`
        );

        const market =
            await fetchTokenMarketData(
                token.mintAddress
            );

        if (!market) {

            console.log(
                "⚠️ Market data unavailable"
            );

            return;

        }

        // These will be replaced with real services later.

        const holderData = null;

        const walletIntel = null;

        const momentumData = null;

        const snapshot =
            buildSnapshot({

                token,

                market,

                holderData,

                walletIntel,

                momentumData,

            });

if (snapshot.priceUsd == null) {

    console.log(
        `⚠️ No price available for ${token.symbol}. Skipping tracking.`
    );

    return;

}

        await saveOutcomeSnapshot(
            snapshot
        );

        await updateTradeOutcome(
            token,
            snapshot
        );

if (

    isLifecycleComplete(
        snapshot,
        token
    )

) {

    const closedAt =
        new Date();

    token.trackingComplete = true;

    token.tradeOutcome.closedAt =
        closedAt;

    token.tradeOutcome.exitPriceUsd =
        snapshot.priceUsd;

    token.tradeOutcome.realizedPnLPercent =
        snapshot.returnPct;

    // ----------------------------------------
    // Lifecycle Statistics
    // ----------------------------------------

    const peakReachedAt =
        token.tradeOutcome.peakReachedAt;

    const peakReturn =
        token.peakReturn ?? 0;

    const finalReturn =
        snapshot.returnPct ?? 0;

    token.tradeOutcome.minutesToPeak =
        peakReachedAt
            ? Math.floor(
                  (
                      peakReachedAt.getTime() -
                      token.scannedAt.getTime()
                  ) / 60000
              )
            : null;

    token.tradeOutcome.minutesFromPeakToCollapse =
        peakReachedAt
            ? Math.floor(
                  (
                      closedAt.getTime() -
                      peakReachedAt.getTime()
                  ) / 60000
              )
            : null;

    token.tradeOutcome.collapsePercent =
        peakReturn - finalReturn;

    // ----------------------------------------
    // Final Label
    // ----------------------------------------

    if (peakReturn >= 1000) {

        token.label = "MOONSHOT";

    } else if (peakReturn >= 200) {

        token.label = "WINNER";

    } else if (peakReturn <= 0 && finalReturn <= -90) {

        token.label = "RUG_OR_FAILURE";

    } else if (finalReturn < 0) {

        token.label = "LOSER";

    } else {

        token.label = "NEUTRAL";

    }

    console.log(

        `✅ Lifecycle completed for ${token.symbol}`,

        {

            label: token.label,

            peakReturn,

            finalReturn,

            minutesToPeak:
                token.tradeOutcome.minutesToPeak,

            minutesFromPeakToCollapse:
                token.tradeOutcome.minutesFromPeakToCollapse,

            collapsePercent:
                token.tradeOutcome.collapsePercent,

        }

    );

}

await token.save();

        console.log({

            symbol:
                token.symbol,

            currentPrice:
                snapshot.priceUsd,

            returnPct:
                snapshot.returnPct,

            liquidity:
                snapshot.liquidityUsd,

            marketCap:
                snapshot.marketCapUsd,

        });



    } catch (error) {

        console.error(

            `❌ Failed tracking ${token.symbol}`,

            error

        );

    }

}

async function updateTradeOutcome(
    token,
    snapshot
) {

    // ⬇️ ADD THIS

    if (!token.tradeOutcome) {

        token.tradeOutcome = {};

    }

    const currentPrice =
        snapshot.priceUsd;

    const currentReturn =
        snapshot.returnPct ?? 0;

// ⬇️ ADD THIS

if (currentPrice == null) {

    return;

}

    // ----------------------------------------
    // Highest Price
    // ----------------------------------------

    if (

        token.tradeOutcome.highestPriceUsd == null ||

        currentPrice >
            token.tradeOutcome.highestPriceUsd

    ) {

        token.tradeOutcome.highestPriceUsd =
            currentPrice;

    }

    // ----------------------------------------
    // Lowest Price
    // ----------------------------------------

    if (

        token.tradeOutcome.lowestPriceUsd == null ||

        currentPrice <
            token.tradeOutcome.lowestPriceUsd

    ) {

        token.tradeOutcome.lowestPriceUsd =
            currentPrice;

    }

    // ----------------------------------------
    // Highest Return
    // ----------------------------------------

    if (

        token.tradeOutcome.highestReturn == null ||

        currentReturn >
            token.tradeOutcome.highestReturn

    ) {

        token.tradeOutcome.highestReturn =
            currentReturn;

    }

    // ----------------------------------------
    // Lowest Return
    // ----------------------------------------

    if (

        token.tradeOutcome.lowestReturn == null ||

        currentReturn <
            token.tradeOutcome.lowestReturn

    ) {

        token.tradeOutcome.lowestReturn =
            currentReturn;

    }

  // ----------------------------------------
// Peak Return
// ----------------------------------------

if (

    token.peakReturn == null ||

    currentReturn >
        token.peakReturn

) {

    token.peakReturn =
        currentReturn;

    token.tradeOutcome.peakPriceUsd =
        currentPrice;

    token.tradeOutcome.peakReachedAt =
        new Date();

}

    // ----------------------------------------
    // Hold Minutes
    // ----------------------------------------

    token.tradeOutcome.holdMinutes =
        Math.floor(

            (

                Date.now() -

                token.scannedAt.getTime()

            ) / 60000

        );

}

function isLifecycleComplete(snapshot, token) {

    let score = 0;

    if ((snapshot.liquidityUsd ?? 0) < 500)
        score++;

    if ((snapshot.volume5mUsd ?? 0) === 0)
        score++;

    if ((snapshot.buys5m ?? 0) === 0)
        score++;

    if ((snapshot.returnPct ?? 0) <= -95)
        score++;

    const holdMinutes =
        token.tradeOutcome?.holdMinutes ?? 0;

    if (holdMinutes > 1440)
        score++;

    return score >= 3;

}