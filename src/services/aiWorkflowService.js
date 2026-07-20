import {
    updateMultiple,
    addActivity,
} from "./aiStateService.js";

// =====================================================
// SCAN STARTED
// =====================================================

export function scanStarted(walletAddress, tokenMint) {
    if (!walletAddress) return;

    updateMultiple(walletAddress, {
        system: {
            status: "SCANNING",
            currentTask: "Scanning token",
        },

        pipeline: {
            active: true,
            stage: "DISCOVERY",
            progress: 0,
            token: tokenMint,
            startedAt: Date.now(),
        },

        diagnostics: {
            apiHealth: "HEALTHY",
            queueDepth: 1,
        },
    });

    addActivity(walletAddress, {
        type: "SCAN_STARTED",
        title: "Started scanning token",
        description: tokenMint,
    });
}

// =====================================================
// STAGE UPDATE
// =====================================================

export function scanStage(
    walletAddress,
    stage,
    progress
) {
    if (!walletAddress) return;

    updateMultiple(walletAddress, {
    pipeline: {
        stage,
        progress,
    },
});
}

// =====================================================
// MARKET UPDATED
// =====================================================

export function marketUpdated(
    walletAddress,
    market
) {
    if (!walletAddress || !market) return;

    updateMultiple(walletAddress, {
    market: {
        sentiment:
            market.sentiment ?? "UNKNOWN",

        trend:
            market.trend ?? "UNKNOWN",

        liquidity:
            market.liquidityVerdict ?? "UNKNOWN",

        volatility:
            market.volatility ?? "UNKNOWN",

        marketRisk:
            market.marketRisk ?? "UNKNOWN",

        averageMomentum:
            market.averageMomentum ?? 0,

        totalLiquidityUsd:
            market.totalLiquidityUsd ?? 0,

        bullishTokens:
            market.bullishTokens ?? 0,

        bearishTokens:
            market.bearishTokens ?? 0,
    },
});
}


// =====================================================
// SCAN COMPLETED
// =====================================================

export function scanCompleted(
    walletAddress,
    analysis
) {
    if (!walletAddress) return;

    updateMultiple(walletAddress, {
        pipeline: {
            active: false,
            stage: "COMPLETE",
            progress: 100,
        },

        system: {
            status: "IDLE",
            currentTask: null,
        },

        analysis: {
            recommendation:
                analysis?.recommendation ?? null,

            confidence:
                analysis?.confidence ?? 0,

            forecast:
                analysis?.forecast ?? null,

            signalScore:
                analysis?.signalScore ?? null,

            evidence:
                analysis?.evidence ?? {},

            reasoning:
                analysis?.reasoning ?? {},

            investmentThesis:
                analysis?.investmentThesis ?? {},

            confidenceTrend:
                analysis?.confidence >= 80
                    ? "RISING"
                    : analysis?.confidence >= 50
                    ? "STABLE"
                    : "FALLING",
        },
    });

    addActivity(walletAddress, {
        type: "SCAN_COMPLETED",
        title: "Scan finished",
        description:
            analysis?.recommendation?.action ??
            analysis?.recommendation ??
            "Analysis complete",

        confidence:
            analysis?.confidence ?? 0,
    });
}

// =====================================================
// SCAN FAILED
// =====================================================

export function scanFailed(
    walletAddress,
    error
) {
    if (!walletAddress) return;

    updateMultiple(walletAddress, {
        system: {
            status: "ERROR",
            currentTask: null,
        },

        pipeline: {
            active: false,
            stage: "FAILED",
        },

        diagnostics: {
            apiHealth: "DEGRADED",
            lastSuccessfulScan: null,
        },
    });

    addActivity(walletAddress, {
        type: "SCAN_FAILED",
        title: "Scan failed",
        description:
            error?.message ??
            String(error),
    });
}