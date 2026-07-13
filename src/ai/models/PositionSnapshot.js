import mongoose from "mongoose";

import AIEvidenceSchema from "../core/AIEvidenceSchema.js";

const PositionSnapshotSchema = new mongoose.Schema({

    // =====================================================
    // Identity
    // =====================================================

    positionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    walletAddress: {
        type: String,
        required: true,
        index: true,
    },

    tradingWallet: {
        type: String,
        required: true,
        index: true,
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },

    source: {
        type: String,
        enum: [
            "AUTO_TRADING",
            "MANUAL_BUY",
            "AI_SCANNER",
        ],
        required: true,
    },

    // =====================================================
    // Token
    // =====================================================

    token: {

        mint: String,

        pair: String,

        symbol: String,

        name: String,

        dex: String,

        chain: {
            type: String,
            default: "solana",
        },

    },

    // =====================================================
    // Entry
    // =====================================================

    entry: {

        priceUsd: Number,

        priceSol: Number,

        tokenAmount: Number,

        investedSol: Number,

        transactionSignature: String,

        slippage: Number,

        networkFee: Number,

        timestamp: Date,

    },

    // =====================================================
    // Market Snapshot
    // =====================================================

    market: {

        liquidityUsd: Number,

        marketCapUsd: Number,

        fdvUsd: Number,

        volume5mUsd: Number,

        volume1hUsd: Number,

        holderCount: Number,

        ageMinutes: Number,

        spreadPercent: Number,

    },

    // =====================================================
    // Investment Thesis
    // =====================================================

    investmentThesis: {

        overallScore: Number,

        confidence: Number,

        summary: String,

        pillars: {

            market: Number,

            liquidity: Number,

            holders: Number,

            smartMoney: Number,

            momentum: Number,

            technical: Number,

            forecast: Number,

            risk: Number,

        },

    },

    // =====================================================
    // AI Evidence
    // =====================================================

    evidence: {

        forecast: AIEvidenceSchema,

        liquidity: AIEvidenceSchema,

        holders: AIEvidenceSchema,

        wallets: AIEvidenceSchema,

        momentum: AIEvidenceSchema,

        volume: AIEvidenceSchema,

        chart: AIEvidenceSchema,

        risk: AIEvidenceSchema,

    },

    // =====================================================
    // Trade Configuration
    // =====================================================

    tradeConfiguration: {

        stopLossPercent: Number,

        trailingStopPercent: Number,

        trailingEnabled: Boolean,

        takeProfit1: Number,

        takeProfit2: Number,

        takeProfit3: Number,

        aiExitEnabled: Boolean,

        autoTradingEnabled: Boolean,

    },

    // =====================================================
    // User Configuration
    // =====================================================

    userConfiguration: {

        aiProfile: String,

        strategyVersion: String,

        riskLevel: String,

    },

    // =====================================================
    // AI Decision Trace
    // =====================================================

    decisionTrace: {

        recommendation: String,

        confidence: Number,

        summary: String,

        reasons: [String],

        enginesUsed: [String],

    },

    // =====================================================
    // Confidence Gaps
    // =====================================================

    confidenceGaps: {

        degradedConfidence: {
            type: Boolean,
            default: false,
        },

        missingEngines: {
            type: [String],
            default: [],
        },

        unavailableData: {
            type: [String],
            default: [],
        },

    },

    // =====================================================
    // Learning
    // =====================================================

    learning: {

        outcome: {

            type: String,

            enum: [

                "PENDING",

                "WINNER",

                "LOSER",

                "MOONSHOT",

                "RUG",

            ],

            default: "PENDING",

        },

        completed: {

            type: Boolean,

            default: false,

        },

        exitReason: String,

        maxProfitPercent: Number,

        maxDrawdownPercent: Number,

    },

},
{
    versionKey: false,
});

export default mongoose.model(
    "PositionSnapshot",
    PositionSnapshotSchema
);