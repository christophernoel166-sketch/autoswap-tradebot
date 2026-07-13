// src/ai/services/AIContextBuilder.js

import { ulid } from "ulid";

/**
 * ==========================================================
 * AI Context Builder
 * ==========================================================
 *
 * Creates the master AI context for a newly opened position.
 *
 * Responsibilities
 * ----------------
 * ✔ Build a standardized AI context
 * ✔ Generate unique IDs
 * ✔ Freeze user settings at entry
 * ✔ Store execution metadata
 * ✔ Initialize AI runtime state
 *
 * NEVER
 * -----
 * ✘ Call APIs
 * ✘ Scan tokens
 * ✘ Execute trades
 * ✘ Save MongoDB
 * ✘ Send notifications
 * ✘ Calculate AI scores
 *
 * ==========================================================
 */

export function buildAIContext({

    user,
    wallet,
    mint,
    buyResult,
    quote,
    entryPrice,
    tokenAmount,
    solAmount,
    source,

}) {

    if (!user) {
        throw new Error("AIContext: user is required");
    }

    if (!wallet) {
        throw new Error("AIContext: wallet is required");
    }

    if (!mint) {
        throw new Error("AIContext: mint is required");
    }

    const now = new Date();

    const sessionId = ulid();

    return {

        // =====================================================
        // Identity
        // =====================================================

        contextId: ulid(),

        positionId: ulid(),

        sessionId,

        correlationId: sessionId,

        createdAt: now,

        // =====================================================
        // Source
        // =====================================================

        source: {

            type: source,

            trigger: null,

            channelId: null,

            scannerId: null,

            signalId: null,

        },

        // =====================================================
        // User
        // =====================================================

        user: {

            id: user._id,

            walletAddress: user.walletAddress,

            tradingWallet: wallet.publicKey.toBase58(),

        },

        // =====================================================
        // Token
        // =====================================================

        token: {

            mint,

            pair: null,

            symbol: null,

            name: null,

            dex: null,

            chain: "solana",

        },

        // =====================================================
        // Trade
        // =====================================================

        trade: {

            transactionSignature:
                buyResult?.txid || null,

            quote,

            tokenAmount,

            solAmount,

            entryPrice,

            entryTimestamp: now,

        },

        // =====================================================
        // Frozen User Settings
        // =====================================================

        settings: {

            stopLoss:
                user.stopLossPercent,

            tp1:
                user.tp1,

            tp2:
                user.tp2,

            tp3:
                user.tp3,

            trailingDistance:
                user.trailingDistancePercent,

            trailingActivation:
                user.trailingActivationPercent,

            autoTrading:
                user.tradingEnabled,

            aiExitEnabled:
                user.aiExitEnabled || false,

        },

        // =====================================================
        // Metadata
        // =====================================================

        metadata: {

            aiVersion:
                process.env.AI_VERSION || "1.0.0",

            strategyVersion:
                process.env.STRATEGY_VERSION || "1.0.0",

            scannerVersion:
                process.env.SCANNER_VERSION || "1.0.0",

            botVersion:
                process.env.npm_package_version || "unknown",

            environment:
                process.env.NODE_ENV || "development",

            rpcProvider:
                process.env.RPC_PROVIDER || "unknown",

            generatedAt: now,

        },

        // =====================================================
        // Runtime Metrics
        // =====================================================

        runtime: {

            buyLatencyMs: null,

            scanLatencyMs: null,

            orchestratorLatencyMs: null,

            snapshotLatencyMs: null,

            monitorLatencyMs: null,

            totalProcessingMs: null,

        },

        // =====================================================
        // Engine Performance
        // =====================================================

        engineMetrics: {

            forecast: null,

            liquidity: null,

            holders: null,

            wallets: null,

            momentum: null,

            volume: null,

            chart: null,

            risk: null,

        },

        // =====================================================
        // Lifecycle
        // =====================================================

        lifecycle: {

            state: "CREATED",

            currentPhase: "CONTEXT",

            stages: [

                "CONTEXT_CREATED",

            ],

            lastUpdated: now,

        },

        // =====================================================
        // Timeline
        // =====================================================

        timeline: [

            {

                stage: "CONTEXT_CREATED",

                timestamp: now,

                details: {

                    source,

                },

            },

        ],

        // =====================================================
        // Diagnostics
        // =====================================================

        diagnostics: {

            warnings: [],

            errors: [],

            debug: [],

        },

        // =====================================================
        // AI Analysis
        // =====================================================

        analyses: {

            forecast: null,

            liquidity: null,

            holders: null,

            wallets: null,

            momentum: null,

            volume: null,

            chart: null,

            risk: null,

        },

        // =====================================================
        // AI Evidence
        // =====================================================

        evidence: {

            forecast: null,

            liquidity: null,

            holders: null,

            wallets: null,

            momentum: null,

            volume: null,

            chart: null,

            risk: null,

        },

        // =====================================================
        // AI Output
        // =====================================================

        investmentThesis: null,

        recommendation: null,

        positionHealth: null,

        conviction: null,

        exitReadiness: null,

        confidence: null,

        confidenceGaps: {

            degradedConfidence: false,

            missingEngines: [],

            unavailableData: [],

        },

        // =====================================================
        // Future Learning
        // =====================================================

        learning: {

            enabled: true,

            snapshotSaved: false,

            monitoringStarted: false,

            recommendationHistory: [],

        },

        // =====================================================
        // Runtime Flags
        // =====================================================

        flags: {

            frozen: false,

            validated: false,

            snapshotCreated: false,

            monitoringStarted: false,

            completed: false,

        },

    };

}