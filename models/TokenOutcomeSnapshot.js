import mongoose from "mongoose";

const TokenOutcomeSnapshotSchema = new mongoose.Schema({

    // =====================================================
    // REFERENCES
    // =====================================================

    tokenOutcomeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TokenOutcome",
        required: true,
        index: true,
    },

    mintAddress: {
        type: String,
        required: true,
        index: true,
    },

    // =====================================================
    // PRICE
    // =====================================================

    priceUsd: Number,

    returnPct: Number,

    // =====================================================
    // MARKET
    // =====================================================

    liquidityUsd: Number,

    marketCapUsd: Number,

    volume5mUsd: Number,

    buys5m: Number,

    sells5m: Number,

    // =====================================================
    // HOLDERS
    // =====================================================

    holderCount: Number,

    largestHolderPercent: Number,

    top10HoldingPercent: Number,

    // =====================================================
    // WALLET INTELLIGENCE
    // =====================================================

    smartDegenCount: Number,

    botDegenCount: Number,

    ratTraderCount: Number,

    alphaCallerCount: Number,

    sniperWalletCount: Number,

    // =====================================================
    // MOMENTUM
    // =====================================================

    momentumScore: Number,

    velocityBreakoutScore: Number,

    // =====================================================
    // FORECAST
    // =====================================================

    forecastScore: Number,

    overallConfidence: Number,

    // =====================================================
    // TIMESTAMP
    // =====================================================

    capturedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },

},
{
    collection: "tokenoutcomesnapshots",
});

TokenOutcomeSnapshotSchema.index({

    tokenOutcomeId: 1,

    capturedAt: 1,

});

export default
    mongoose.models.TokenOutcomeSnapshot ||
    mongoose.model(
        "TokenOutcomeSnapshot",
        TokenOutcomeSnapshotSchema
    );