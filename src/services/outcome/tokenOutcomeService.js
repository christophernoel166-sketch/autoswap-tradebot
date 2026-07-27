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
                "AI_PIPELINE_V2",

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