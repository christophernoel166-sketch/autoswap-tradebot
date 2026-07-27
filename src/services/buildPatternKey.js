export function buildPatternKey(outcome) {

    const confidenceBucket =
        outcome.learning?.confidenceBucket ??
        bucketConfidence(
            outcome.overallConfidence
        );

    const marketRegime =
        outcome.learning?.marketRegime ??
        "UNKNOWN";

    return [

        `FV:${outcome.forecastVerdict ?? "UNKNOWN"}`,

        `CB:${confidenceBucket}`,

        `MR:${marketRegime}`,

        `MOM:${bucket(outcome.momentumScore, 20)}`,

        `VEL:${bucket(outcome.velocityBreakoutScore, 20)}`,

        `WAL:${bucket(outcome.walletQualityScore, 20)}`,

        `RUG:${bucket(outcome.rugRiskScore, 20)}`,

        `BUNDLE:${bucket(outcome.bundleScore, 20)}`,

    ].join("|");

}

function bucket(value, step = 20) {

    if (!Number.isFinite(value)) {

        return "UNKNOWN";

    }

    return Math.floor(value / step) * step;

}

function bucketConfidence(score) {

    if (!Number.isFinite(score)) {

        return "UNKNOWN";

    }

    if (score >= 90) return "VERY_HIGH";

    if (score >= 75) return "HIGH";

    if (score >= 60) return "MODERATE";

    if (score >= 40) return "LOW";

    return "VERY_LOW";

}