export function buildSnapshot({

    token,

    market,

    holderData = null,

    walletIntel = null,

    momentumData = null,

}) {

    const currentPrice =
        market.metrics?.priceUsd ?? null;

    const returnPct =
        calculateReturn(

            token.entryPriceUsd,

            currentPrice

        );

    return {

        tokenOutcomeId:
            token._id,

        mintAddress:
            token.mintAddress,

        priceUsd:
            currentPrice,

        returnPct,

        liquidityUsd:
            market.metrics?.liquidityUsd ?? null,

        marketCapUsd:
            market.metrics?.marketCapUsd ?? null,

        volume5mUsd:
            market.metrics?.volume5mUsd ?? null,

        buys5m:
            market.metrics?.buys5m ?? null,

        sells5m:
            market.metrics?.sells5m ?? null,

        holderCount:
            holderData?.holderCount ?? null,

        largestHolderPercent:
            holderData?.largestHolderPercent ?? null,

        top10HoldingPercent:
            holderData?.top10HoldingPercent ?? null,

        smartDegenCount:
            walletIntel?.smartDegenCount ?? null,

        botDegenCount:
            walletIntel?.botDegenCount ?? null,

        ratTraderCount:
            walletIntel?.ratTraderCount ?? null,

        alphaCallerCount:
            walletIntel?.alphaCallerCount ?? null,

        sniperWalletCount:
            walletIntel?.sniperWalletCount ?? null,

        momentumScore:
            momentumData?.momentumScore ?? null,

        velocityBreakoutScore:
            momentumData?.velocityBreakoutScore ?? null,

        forecastScore:
            token.forecastScore ?? null,

        overallConfidence:
            token.overallConfidence ?? null,

    };

}

function calculateReturn(

    entryPrice,

    currentPrice

) {

    if (

        !entryPrice ||

        !currentPrice ||

        entryPrice <= 0

    ) {

        return null;

    }

    return (

        (

            currentPrice -

            entryPrice

        ) /

        entryPrice

    ) * 100;

}