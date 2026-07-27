export function generateRecommendation({

    confidence,

    confidenceGrade,

    breakdown,

    historicalPattern,

    forecast,

    walletIntelligence,

    momentum,

    liquidityAnalysis,

    volumeAnalysis,

    rugRisk,

}) {

    const reasons = [];

    const walletScore =
        walletIntelligence?.score ?? 0;

    const momentumScore =
        momentum?.score ?? 0;

    const liquidityScore =
        liquidityAnalysis?.liquidityScore ?? 0;

    const volumeScore =
        volumeAnalysis?.volumeScore ?? 0;

    const forecastScore =
        forecast?.forecastScore ?? 0;

    const rugScore =
        rugRisk?.score ?? 0;

    if (

        rugScore >= 80 ||

        liquidityScore < 20 ||

        walletScore < 20

    ) {

        reasons.push(
            "Risk too high."
        );

        return buildResult({

            recommendation:
                "REJECT",

            confidence,

            confidenceGrade,

            reasons,

        });

    }

    if (

        confidence >= 90 &&

        historicalPattern?.found &&

        historicalPattern.winRate >= 70 &&

        walletScore >= 80 &&

        momentumScore >= 80 &&

        forecastScore >= 85

    ) {

        reasons.push(

            "Historical pattern has a high win rate.",

            "Wallet quality is excellent.",

            "Momentum is strong.",

            "Forecast is highly bullish."

        );

        return buildResult({

            recommendation:
                "STRONG_BUY",

            confidence,

            confidenceGrade,

            reasons,

        });

    }

    if (

        confidence >= 80 &&

        walletScore >= 60 &&

        momentumScore >= 60 &&

        forecastScore >= 70

    ) {

        reasons.push(

            "Confidence is high.",

            "Technical indicators are positive."

        );

        return buildResult({

            recommendation:
                "BUY",

            confidence,

            confidenceGrade,

            reasons,

        });

    }

    if (

        confidence >= 60

    ) {

        reasons.push(

            "Signal needs more confirmation."

        );

        return buildResult({

            recommendation:
                "WATCH",

            confidence,

            confidenceGrade,

            reasons,

        });

    }

    reasons.push(

        "Overall confidence is too low."

    );

    return buildResult({

        recommendation:
            "AVOID",

        confidence,

        confidenceGrade,

        reasons,

    });

}

function buildResult({

    recommendation,

    confidence,

    confidenceGrade,

    reasons,

}) {

    return {

        recommendation,

        confidence,

        confidenceGrade,

        reasons,

    };

}