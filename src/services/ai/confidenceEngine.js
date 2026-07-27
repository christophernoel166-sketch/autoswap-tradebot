const WEIGHTS = {

    historical: 0.25,

    forecast: 0.20,

    chart: 0.15,

    wallet: 0.15,

    momentum: 0.10,

    volume: 0.05,

    liquidity: 0.05,

    rugPenalty: 0.05,

};

export function calculateConfidence({

    forecast,

    chartEntry,

    momentum,

    volumeAnalysis,

    liquidityAnalysis,

    walletIntelligence,

    rugRisk,

    historicalPattern,

}) {

    const scores = {

        historical:
            getHistoricalScore(
                historicalPattern
            ),

        forecast:
            clamp(
                forecast?.forecastScore
            ),

        chart:
            clamp(
                chartEntry?.confidence
            ),

        wallet:
            clamp(
                walletIntelligence?.score
            ),

        momentum:
            clamp(
                momentum?.score
            ),

        volume:
            clamp(
                volumeAnalysis?.volumeScore
            ),

        liquidity:
            clamp(
                liquidityAnalysis?.liquidityScore
            ),

        rugPenalty:
            clamp(
                rugRisk?.score
            ),

    };

    let confidence =

        scores.historical * WEIGHTS.historical +

        scores.forecast * WEIGHTS.forecast +

        scores.chart * WEIGHTS.chart +

        scores.wallet * WEIGHTS.wallet +

        scores.momentum * WEIGHTS.momentum +

        scores.volume * WEIGHTS.volume +

        scores.liquidity * WEIGHTS.liquidity -

        scores.rugPenalty * WEIGHTS.rugPenalty;

    confidence = clamp(confidence);

    return {

        confidence:
            Number(
                confidence.toFixed(2)
            ),

        confidenceGrade:
            getConfidenceGrade(
                confidence
            ),

        breakdown: {

            historical:
                scores.historical,

            forecast:
                scores.forecast,

            chart:
                scores.chart,

            wallet:
                scores.wallet,

            momentum:
                scores.momentum,

            volume:
                scores.volume,

            liquidity:
                scores.liquidity,

            rugPenalty:
                scores.rugPenalty,

        },

    };

}

function getHistoricalScore(
    historical
) {

    if (
        !historical?.found
    ) {

        // Unknown history is treated as neutral.
        return 50;

    }

    return clamp(
        historical.confidenceScore
    );

}

function getConfidenceGrade(
    confidence
) {

    if (
        confidence >= 90
    ) {

        return "VERY_HIGH";

    }

    if (
        confidence >= 80
    ) {

        return "HIGH";

    }

    if (
        confidence >= 65
    ) {

        return "MODERATE";

    }

    if (
        confidence >= 50
    ) {

        return "LOW";

    }

    return "VERY_LOW";

}

function clamp(
    value,
    min = 0,
    max = 100
) {

    if (
        !Number.isFinite(value)
    ) {

        return min;

    }

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );

}