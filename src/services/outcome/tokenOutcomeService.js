import TokenOutcome from "../../../models/TokenOutcome.js";

export async function saveTokenOutcome({

    tokenMint,
    walletAddress,

    market,
    holderData,
    walletIntel,
    profitWalletData,
    momentumData,
    integrityData,
    riskStructureData,
        rugRiskData,

    developerProfile,

   forecast,
signalScore,


aiRecommendation,
aiContext,

}) {

    const tokenOutcomeDocument = {

        // =====================================================
        // Identification
        // =====================================================

        mintAddress: tokenMint.trim(),

        pairAddress:
            market.token?.pairAddress || null,

        symbol:
            market.token?.symbol || null,

        name:
            market.token?.name || null,

        // =====================================================
        // Source
        // =====================================================

        source: "manual_scan",

        walletAddress:
            walletAddress || null,

        // =====================================================
        // Timing
        // =====================================================

        scannedAt: new Date(),

        // =====================================================
        // Entry Price
        // =====================================================

        entryPriceUsd:
            market.metrics?.priceUsd ?? null,

        // =====================================================
        // Market
        // =====================================================

        ageMinutes:
            market.metrics?.ageMinutes,

        liquidityUsd:
            market.metrics?.liquidityUsd,

        marketCapUsd:
            market.metrics?.marketCapUsd,

        volume5mUsd:
            market.metrics?.volume5mUsd,

        buys5m:
            market.metrics?.buys5m,

        sells5m:
            market.metrics?.sells5m,

        // =====================================================
        // Holder Metrics
        // =====================================================

        largestHolderPercent:
            holderData?.largestHolderPercent,

        top10HoldingPercent:
            holderData?.top10HoldingPercent,

        // =====================================================
        // Wallet Intelligence
        // =====================================================

        smartDegenCount:
            walletIntel?.smartDegenCount,

        botDegenCount:
            walletIntel?.botDegenCount,

        ratTraderCount:
            walletIntel?.ratTraderCount,

        alphaCallerCount:
            walletIntel?.alphaCallerCount,

        sniperWalletCount:
            walletIntel?.sniperWalletCount,

        // =====================================================
        // Profit Wallets
        // =====================================================

        profitableWalletCount:
            profitWalletData?.profitableWalletCount,

        walletQualityScore:
            profitWalletData?.walletQualityScore,

        profitWalletConfidence:
            profitWalletData?.profitWalletConfidence,

        // =====================================================
        // Momentum
        // =====================================================

        momentumScore:
            momentumData?.momentumScore,

        velocityBreakoutScore:
            momentumData?.velocityBreakoutScore,

        // =====================================================
        // Market Integrity
        // =====================================================

        walletParticipationScore:
            integrityData?.walletParticipationScore,

        velocitySanityScore:
            integrityData?.velocitySanityScore,

        washTradingRiskScore:
            integrityData?.washTradingRiskScore,

        bundleSuspicionScore:
            integrityData?.bundleSuspicionScore,

        artificialVolumeFlag:
            integrityData?.artificialVolumeFlag,

        fakeMomentumFlag:
            integrityData?.fakeMomentumFlag,

        // =====================================================
        // Risk Structure
        // =====================================================

        bundleScore:
            riskStructureData?.bundleScore,

        bundledWalletCount:
            riskStructureData?.bundledWalletCount,

        fundingClusterScore:
            riskStructureData?.fundingClusterScore,

        largestFundingCluster:
            riskStructureData?.largestFundingCluster,

        // =====================================================
        // Rug Risk
        // =====================================================

        devDumpRiskScore:
            rugRiskData?.devDumpRiskScore,

        liquidityPullRiskScore:
            rugRiskData?.liquidityPullRiskScore,

        insiderRiskScore:
            rugRiskData?.insiderRiskScore,

        rugRiskScore:
            rugRiskData?.rugRiskScore,


        // =====================================================
        // Developer Intelligence
        // =====================================================

        developerWallet:
            developerProfile?.wallet ??
            rugRiskData?.developerWallet ??
            null,

        developerTrustScore:
            developerProfile?.trustScore ?? 50,

        developerTokensCreated:
            developerProfile?.tokensCreated ?? 0,

        developerWinRate:
            developerProfile?.winRate ?? 0,

        developerRugRate:
            developerProfile?.rugRate ?? 0,

        developerMoonshots:
            developerProfile?.moonshots ?? 0,


        // =====================================================
        // Forecast
        // =====================================================

        forecastScore:
            forecast?.forecastScore ?? null,

        forecastVerdict:
            forecast?.verdict ?? null,

        // =====================================================
        // Signal
        // =====================================================

        signalScore:
            signalScore?.signalScore ?? null,

        recommendation:
            aiRecommendation?.action ?? null,

        recommendationConfidence:
            aiRecommendation?.confidence ?? null,

        overallConfidence:
            aiContext?.confidence ?? null,


// =====================================================
// AI Metrics
// =====================================================

consensus:
    aiRecommendation?.consensus ?? 0,

trustScore:
    aiRecommendation?.trustScore ?? 0,

agreement:
    aiRecommendation?.agreement ?? 0,

positiveVotes:
    aiRecommendation?.positiveVotes ?? 0,

scannerVotes:
    aiRecommendation?.scannerVotes ?? {},

        // =====================================================
        // AI Snapshot
        // =====================================================

        aiSnapshot: {

            confidence:
                aiContext?.confidence ?? null,

            recommendation:
                aiRecommendation?.action ?? null,

            executionProfile:
                aiRecommendation?.executionProfile ?? null,

            strategy:
                aiRecommendation?.strategy ?? null,

            reasoning:
                aiRecommendation?.reasons ??
                aiRecommendation?.reasoning ??
                [],

            pipelineVersion:
                "AI_PIPELINE_V3",

        },

// =====================================================
// ENTRY ANALYSIS SNAPSHOT
// =====================================================

entryAnalysis: {

    chart:
        aiContext?.chartAnalysis ?? {},

    forecast:
        forecast ?? {},

    momentum:
        momentumData ?? {},

    liquidity:
        aiContext?.liquidityAnalysis ?? {},

    volume:
        aiContext?.volumeAnalysis ?? {},

    walletIntelligence:
        walletIntel ?? {},

    holders:
        holderData ?? {},

    rugRisk:
        rugRiskData ?? {},

    integrity:
        integrityData ?? {},

   developer: {

    wallet:
        developerProfile?.wallet ??
        rugRiskData?.developerWallet ??
        null,

    trustScore:
        developerProfile?.trustScore ?? 50,

    winRate:
        developerProfile?.winRate ?? 0,

    rugRate:
        developerProfile?.rugRate ?? 0,

    moonshots:
        developerProfile?.moonshots ?? 0,

    tokensCreated:
        developerProfile?.tokensCreated ?? 0,

},

    consensus: {

        percentage:
            aiRecommendation?.consensus ?? 0,

        trustScore:
            aiRecommendation?.trustScore ?? 0,

        positiveVotes:
            aiRecommendation?.positiveVotes ?? 0,

        totalVotes:
            aiRecommendation?.scannerVotes
                ? Object.keys(
                    aiRecommendation.scannerVotes
                  ).length
                : 0,

        scannerVotes:
            aiRecommendation?.scannerVotes ?? {},

        contradictions:
            aiRecommendation?.contradictions ?? [],

    },

    ai: {

        recommendation:
            aiRecommendation?.action ?? null,

        confidence:
            aiRecommendation?.confidence ?? 0,

        finalScore:
            aiRecommendation?.finalScore ?? 0,

        trustScore:
            aiRecommendation?.trustScore ?? 0,

        consensus:
            aiRecommendation?.consensus ?? 0,

        reasoning:
            aiRecommendation?.reasoning ?? [],

        blockers:
            aiRecommendation?.blockers ?? [],

    },

    metadata: {

        scannerVersion:
            "AI_PIPELINE_V3",

    },

},


        // =====================================================
        // Initial State
        // =====================================================

        label: "PENDING",

    };

    return await TokenOutcome.create(
        tokenOutcomeDocument
    );
}