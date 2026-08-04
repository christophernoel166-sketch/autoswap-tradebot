import PatternStats from "../../models/PatternStats.js";

export async function updatePatternStats({
    key,
    outcome,
}) {

    let pattern =
        await PatternStats.findOne({
            key,
        });

    if (!pattern) {

        pattern =
            new PatternStats({
                key,
            });

    }

    incrementCounters(
        pattern,
        outcome
    );

    updateRates(pattern);

    updateRunningAverages(
        pattern,
        outcome
    );

    updateExtremes(
        pattern,
        outcome
    );

    pattern.confidenceScore =
        calculateConfidence(
            pattern
        );

    pattern.lastComputedAt =
        new Date();

    await pattern.save();

}

function incrementCounters(
    pattern,
    outcome
) {

    pattern.samples += 1;

    pattern.trainedOutcomes =
    (pattern.trainedOutcomes ?? 0) + 1;

    switch (outcome.label) {

        case "MOONSHOT":

            pattern.moonshots += 1;

            pattern.winners += 1;

            break;

        case "WINNER":

            pattern.winners += 1;

            break;

        case "LOSER":

        case "RUG_OR_FAILURE":

            pattern.losers += 1;

            break;

        case "NEUTRAL":

            pattern.neutrals += 1;

            break;

    }

}

function updateRates(pattern) {

    if (!pattern.samples) {

        return;

    }

    pattern.winRate =
        Number(
            (
                pattern.winners /
                pattern.samples *
                100
            ).toFixed(2)
        );

    pattern.moonshotRate =
        Number(
            (
                pattern.moonshots /
                pattern.samples *
                100
            ).toFixed(2)
        );

    pattern.lossRate =
        Number(
            (
                pattern.losers /
                pattern.samples *
                100
            ).toFixed(2)
        );

}

function updateRunningAverages(
    pattern,
    outcome
) {

    const previous =
        pattern.samples - 1;

    pattern.averagePeakReturn =
        runningAverage(
            pattern.averagePeakReturn,
            previous,
            outcome.peakReturn
        );

    pattern.averageMinutesToPeak =
        runningAverage(
            pattern.averageMinutesToPeak,
            previous,
            outcome.tradeOutcome?.minutesToPeak
        );

    pattern.averageCollapseTime =
        runningAverage(
            pattern.averageCollapseTime,
            previous,
            outcome.tradeOutcome?.minutesFromPeakToCollapse
        );

    pattern.averageCollapsePercent =
        runningAverage(
            pattern.averageCollapsePercent,
            previous,
            outcome.tradeOutcome?.collapsePercent
        );

}

function updateExtremes(
    pattern,
    outcome
) {

    const peak =
        outcome.peakReturn;

   if (
    Number.isFinite(peak)
) {

        if (
            pattern.samples === 1
        ) {

            pattern.bestPeakReturn =
                peak;

            pattern.worstPeakReturn =
                peak;

            return;

        }

        pattern.bestPeakReturn =
            Math.max(
                pattern.bestPeakReturn,
                peak
            );

        pattern.worstPeakReturn =
            Math.min(
                pattern.worstPeakReturn,
                peak
            );

    }

}

function calculateConfidence(
    pattern
) {

    const sampleWeight =
        Math.min(
            pattern.samples,
            100
        ) / 100;

    const confidence =

        pattern.winRate * 0.6 +

        sampleWeight * 100 * 0.3 +

        Math.min(
            Math.max(
                pattern.averagePeakReturn,
                0
            ),
            100
        ) * 0.1;

    return Number(
        confidence.toFixed(2)
    );

}

function runningAverage(
    currentAverage,
    currentSamples,
    newValue
) {

    if (
        newValue === null ||
        newValue === undefined
    ) {

        return currentAverage ?? 0;

    }

    if (
        currentSamples <= 0
    ) {

        return Number(newValue);

    }

    return Number(

        (

            (

                (currentAverage ?? 0) *
                currentSamples +

                newValue

            )

            /

            (

                currentSamples + 1

            )

        ).toFixed(2)

    );

}