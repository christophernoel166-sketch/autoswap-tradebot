const MAX_SCORE = 100;

export function buildEvidence({

    historicalPattern,

    forecast,

    chartEntry,

    momentum,

    walletIntelligence,

    liquidityAnalysis,

    volumeAnalysis,

    integrityAnalysis,

    rugRisk,

}) {

    let score = 50;

    const positives = [];

    const negatives = [];

    const warnings = [];

    const breakdown = {};

    breakdown.historical =
        evaluateHistorical(
            historicalPattern,
            positives,
            negatives
        );

    score += breakdown.historical;

    breakdown.forecast =
        evaluateForecast(
            forecast,
            positives,
            negatives
        );

    score += breakdown.forecast;

    breakdown.chart =
        evaluateChart(
            chartEntry,
            positives,
            negatives
        );

    score += breakdown.chart;

    breakdown.momentum =
        evaluateMomentum(
            momentum,
            positives,
            negatives
        );

    score += breakdown.momentum;

    breakdown.wallet =
        evaluateWallet(
            walletIntelligence,
            positives,
            negatives
        );

    score += breakdown.wallet;

    breakdown.liquidity =
        evaluateLiquidity(
            liquidityAnalysis,
            positives,
            negatives
        );

    score += breakdown.liquidity;

    breakdown.volume =
        evaluateVolume(
            volumeAnalysis,
            positives,
            negatives
        );

    score += breakdown.volume;

    breakdown.integrity =
        evaluateIntegrity(
            integrityAnalysis,
            positives,
            negatives,
            warnings
        );

    score += breakdown.integrity;

    breakdown.risk =
        evaluateRisk(
            rugRisk,
            negatives,
            warnings
        );

    score += breakdown.risk;

    score = Math.max(
        0,
        Math.min(
            MAX_SCORE,
            score
        )
    );

    return {

        evidenceScore:
            Number(
                score.toFixed(2)
            ),

        positives,

        negatives,

        warnings,

        breakdown,

    };

}

function evaluateHistorical(
    historical,
    positives,
    negatives
) {

    if (
        !historical?.found
    ) {

        negatives.push(
            "No historical pattern available."
        );

        return 0;

    }

    let score = 0;

    if (
        historical.winRate >= 75
    ) {

        score += 12;

        positives.push(
            `Historical win rate ${historical.winRate}%.`
        );

    }

    else if (
        historical.winRate < 40
    ) {

        score -= 12;

        negatives.push(
            `Historical win rate only ${historical.winRate}%.`
        );

    }

    if (
        historical.averagePeakReturn >= 200
    ) {

        score += 8;

        positives.push(
            `Average historical peak return ${historical.averagePeakReturn}%.`
        );

    }

    return score;

}

function evaluateForecast(
    forecast,
    positives,
    negatives
) {

    const score =
        forecast?.forecastScore ?? 0;

    if (
        score >= 80
    ) {

        positives.push(
            "Forecast is strongly bullish."
        );

        return 10;

    }

    if (
        score >= 60
    ) {

        positives.push(
            "Forecast is bullish."
        );

        return 5;

    }

    negatives.push(
        "Forecast is weak."
    );

    return -8;

}

function evaluateChart(
    chart,
    positives,
    negatives
) {

    const confidence =
        chart?.confidence ?? 0;

    if (
        confidence >= 85
    ) {

        positives.push(
            "Chart breakout confirmed."
        );

        return 8;

    }

    if (
        confidence >= 65
    ) {

        positives.push(
            "Chart structure is healthy."
        );

        return 4;

    }

    negatives.push(
        "Weak chart confirmation."
    );

    return -6;

}

function evaluateMomentum(
    momentum,
    positives,
    negatives
) {

    const score =
        momentum?.score ?? 0;

    if (
        score >= 80
    ) {

        positives.push(
            "Momentum is accelerating."
        );

        return 8;

    }

    if (
        score >= 60
    ) {

        return 4;

    }

    negatives.push(
        "Momentum is weak."
    );

    return -5;

}

function evaluateWallet(
    wallet,
    positives,
    negatives
) {

    const score =
        wallet?.score ?? 0;

    if (
        score >= 80
    ) {

        positives.push(
            "Wallet quality is excellent."
        );

        return 10;

    }

    if (
        score >= 60
    ) {

        positives.push(
            "Wallet quality is healthy."
        );

        return 5;

    }

    negatives.push(
        "Wallet quality is poor."
    );

    return -10;

}

function evaluateLiquidity(
    liquidity,
    positives,
    negatives
) {

    const score =
        liquidity?.liquidityScore ?? 0;

    if (
        score >= 80
    ) {

        positives.push(
            "Liquidity is strong."
        );

        return 6;

    }

    if (
        score < 40
    ) {

        negatives.push(
            "Liquidity is weak."
        );

        return -8;

    }

    return 0;

}

function evaluateVolume(
    volume,
    positives,
    negatives
) {

    const score =
        volume?.volumeScore ?? 0;

    if (
        score >= 80
    ) {

        positives.push(
            "Trading volume is healthy."
        );

        return 5;

    }

    if (
        score < 40
    ) {

        negatives.push(
            "Low trading volume."
        );

        return -5;

    }

    return 0;

}

function evaluateIntegrity(
    integrity,
    positives,
    negatives,
    warnings
) {

    if (
        !integrity
    ) {

        return 0;

    }

    let score = 0;

    if (
        integrity.bundleDetected
    ) {

        score -= 10;

        warnings.push(
            "Bundle trading detected."
        );

    }

    if (
        integrity.fundingClusterRisk >= 70
    ) {

        score -= 8;

        warnings.push(
            "Funding cluster concentration is high."
        );

    }

    if (
        integrity.holderDistributionScore >= 80
    ) {

        positives.push(
            "Holder distribution is healthy."
        );

        score += 5;

    }

    return score;

}

function evaluateRisk(
    rugRisk,
    negatives,
    warnings
) {

    const score =
        rugRisk?.score ?? 0;

    if (
        score >= 80
    ) {

        warnings.push(
            "Extremely high rug risk."
        );

        return -25;

    }

    if (
        score >= 60
    ) {

        warnings.push(
            "Elevated rug risk."
        );

        return -12;

    }

    if (
        score >= 40
    ) {

        negatives.push(
            "Moderate rug risk."
        );

        return -5;

    }

    return 0;

}