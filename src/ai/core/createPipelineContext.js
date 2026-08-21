/**
 * ==========================================================
 * Create Pipeline Context
 * ==========================================================
 *
 * Canonical AI pipeline context factory.
 *
 * Responsibilities
 * ----------------
 * ✔ Normalize trade requests
 * ✔ Create canonical AI identity
 * ✔ Initialize source metadata
 * ✔ Freeze user/trading settings
 * ✔ Initialize pipeline state
 * ✔ Initialize lifecycle state
 * ✔ Initialize AI analysis containers
 * ✔ Initialize AI evidence
 * ✔ Initialize AI consensus
 * ✔ Initialize decision state
 * ✔ Initialize execution state
 * ✔ Initialize learning / AI memory
 * ✔ Initialize diagnostics and telemetry
 *
 * NEVER
 * -----
 * ✘ Execute AI engines
 * ✘ Buy
 * ✘ Sell
 * ✘ Call APIs
 * ✘ Modify blockchain
 * ✘ Save MongoDB
 * ✘ Access Redis
 *
 * ==========================================================
 */

import crypto from "crypto";

// ==========================================================
// Helpers
// ==========================================================

function createId() {
    return crypto.randomUUID();
}

function resolveAction(tradeRequest) {

    if (tradeRequest?.action) {
        return tradeRequest.action;
    }

    if (tradeRequest?.pipelineType === "EXIT") {
        return "SELL";
    }

    return "BUY";
}

function resolveWalletAddress(tradeRequest) {

    return (
        tradeRequest?.walletAddress ??
        tradeRequest?.user?.walletAddress ??
        null
    );

}

function resolveMint(tradeRequest) {

    return (
        tradeRequest?.mint ??
        tradeRequest?.token?.mint ??
        null
    );

}

// ==========================================================
// Create Pipeline Context
// ==========================================================

export function createPipelineContext(
    tradeRequest = {}
) {

    if (
        tradeRequest === null ||
        tradeRequest === undefined ||
        typeof tradeRequest !== "object"
    ) {

        throw new Error(
            "Pipeline context requires a valid trade request."
        );

    }

    const now = new Date();

    // ======================================================
    // Identity
    // ======================================================

    const requestId =
        tradeRequest.requestId ??
        createId();

    const contextId =
        tradeRequest.contextId ??
        createId();

    const positionId =
        tradeRequest.positionId ??
        createId();

    const sessionId =
        tradeRequest.sessionId ??
        createId();

    const correlationId =
        tradeRequest.correlationId ??
        sessionId;

    // ======================================================
    // Normalized Request
    // ======================================================

    const action =
        resolveAction(tradeRequest);

    const walletAddress =
        resolveWalletAddress(tradeRequest);

    const mint =
        resolveMint(tradeRequest);

    const tokenRequest =
        tradeRequest.token ?? {};

    // ======================================================
    // Pipeline Type
    // ======================================================

    const pipelineName =
        action === "SELL"
            ? "EXIT_PIPELINE"
            : "ENTRY_PIPELINE";

    // ======================================================
    // Source
    // ======================================================

    const source =
        tradeRequest.source ?? "UNKNOWN";

    const sourceMetadata = {

        type:
            tradeRequest.sourceType ??
            source,

        trigger:
            tradeRequest.trigger ??
            null,

        channelId:
            tradeRequest.channelId ??
            null,

        scannerId:
            tradeRequest.scannerId ??
            null,

        signalId:
            tradeRequest.signalId ??
            null,

    };

    // ======================================================
    // Frozen Trading Settings
    // ======================================================

    const user =
        tradeRequest.user ??
        null;

    const settings = {

        stopLoss:
            tradeRequest.settings?.stopLoss ??
            user?.stopLossPercent ??
            null,

        tp1:
            tradeRequest.settings?.tp1 ??
            user?.tp1 ??
            null,

        tp2:
            tradeRequest.settings?.tp2 ??
            user?.tp2 ??
            null,

        tp3:
            tradeRequest.settings?.tp3 ??
            user?.tp3 ??
            null,

        trailingDistance:
            tradeRequest.settings?.trailingDistance ??
            user?.trailingDistancePercent ??
            null,

        trailingActivation:
            tradeRequest.settings?.trailingActivation ??
            user?.trailingActivationPercent ??
            null,

        autoTrading:
            tradeRequest.settings?.autoTrading ??
            user?.tradingEnabled ??
            false,

        aiExitEnabled:
            tradeRequest.settings?.aiExitEnabled ??
            user?.aiExitEnabled ??
            false,

    };

    // ======================================================
    // Context
    // ======================================================

    return {

        // ==================================================
        // Canonical Identity
        // ==================================================

        identity: {

            contextId,

            requestId,

            positionId,

            sessionId,

            correlationId,

        },

        // ==================================================
        // Backward-Compatible Identity
        // ==================================================

        contextId,

        requestId,

        positionId,

        sessionId,

        correlationId,

        // ==================================================
        // Context Metadata
        // ==================================================

        contextVersion:
            "3.0.0",

        createdAt:
            now,

        // ==================================================
        // Original Request
        // ==================================================

        request: {

            ...tradeRequest,

        },

        // ==================================================
        // User
        // ==================================================

        user,

        // ==================================================
        // Wallet
        // ==================================================

        walletAddress,

        wallet:
            tradeRequest.wallet ??
            null,

        // ==================================================
        // Token
        // ==================================================

        token: {

            mint,

            pair:
                tokenRequest.pair ??
                tradeRequest.pair ??
                null,

            symbol:
                tokenRequest.symbol ??
                tradeRequest.symbol ??
                null,

            name:
                tokenRequest.name ??
                tradeRequest.name ??
                null,

            dex:
                tokenRequest.dex ??
                tradeRequest.dex ??
                null,

            chain:
                tokenRequest.chain ??
                "solana",

        },

        // ==================================================
        // Backward-Compatible Mint
        // ==================================================

        mint,

        // ==================================================
        // Trade
        // ==================================================

        trade: {

            action,

            amount:
                tradeRequest.amount ??
                null,

            source,

            transactionSignature:
                tradeRequest.transactionSignature ??
                tradeRequest.txid ??
                null,

            quote:
                tradeRequest.quote ??
                null,

            tokenAmount:
                tradeRequest.tokenAmount ??
                null,

            solAmount:
                tradeRequest.solAmount ??
                null,

            entryPrice:
                tradeRequest.entryPrice ??
                null,

            entryTimestamp:
                tradeRequest.entryTimestamp ??
                null,

        },

        // ==================================================
        // Backward-Compatible Action
        // ==================================================

        action,

        // ==================================================
        // Source Metadata
        // ==================================================

        source:
            sourceMetadata,

        // ==================================================
        // Frozen Settings
        // ==================================================

        settings,

        // ==================================================
        // Pipeline
        // ==================================================

        pipeline: {

            name:
                pipelineName,

            version:
                "3.0.0",

            stage:
                "INITIALIZED",

            status:
                "RUNNING",

            currentEngine:
                null,

            progress:
                0,

            startedAt:
                now,

            completedAt:
                null,

        },

        pipelineHistory: [],

        // ==================================================
        // Lifecycle
        // ==================================================

        lifecycle: {

            state:
                "INITIALIZED",

            currentPhase:
                "STARTUP",

            stages: [],

            lastUpdated:
                now,

        },

        // ==================================================
        // Timeline
        // ==================================================

        timeline: [],

        // ==================================================
        // Runtime
        // ==================================================

        runtime: {

            startedAt:
                now,

            updatedAt:
                now,

            completedAt:
                null,

            durationMs:
                null,

            orchestratorLatencyMs:
                null,

            aiProcessingMs:
                null,

            snapshotLatencyMs:
                null,

            monitorLatencyMs:
                null,

            totalProcessingMs:
                null,

            pipeline:
                null,

        },

        // ==================================================
        // Runtime Flags
        // ==================================================

        flags: {

            completed:
                false,

            frozen:
                false,

            aiReviewed:
                false,

            simulation:
                Boolean(
                    tradeRequest.simulation
                ),

            validated:
                false,

            snapshotCreated:
                false,

            monitoringStarted:
                false,

        },

        // ==================================================
        // Metadata
        // ==================================================

        metadata: {

            aiReviewed:
                false,

            pipelineVersion:
                "3.0.0",

            aiVersion:
                process.env.AI_VERSION ??
                "1.0.0",

            strategyVersion:
                process.env.STRATEGY_VERSION ??
                "1.0.0",

            scannerVersion:
                process.env.SCANNER_VERSION ??
                "1.0.0",

            botVersion:
                process.env.npm_package_version ??
                "unknown",

            environment:
                process.env.NODE_ENV ??
                "development",

            rpcProvider:
                process.env.RPC_PROVIDER ??
                "unknown",

            generatedAt:
                now,

            ...(tradeRequest.metadata ?? {}),

        },

        // ==================================================
        // Raw AI Analyses
        // ==================================================

        analyses: {

            forecast:
                null,

            chart:
                null,

            momentum:
                null,

            velocity:
                null,

            liquidity:
                null,

            volume:
                null,

            holders:
                null,

            wallets:
                null,

            integrity:
                null,

            rugRisk:
                null,

            developer:
                null,

            historicalPattern:
                null,

        },

        // ==================================================
        // AI Evidence
        // ==================================================

        evidence: {

            forecast:
                null,

            chart:
                null,

            momentum:
                null,

            velocity:
                null,

            liquidity:
                null,

            volume:
                null,

            holders:
                null,

            wallets:
                null,

            integrity:
                null,

            rugRisk:
                null,

            developer:
                null,

            historicalPattern:
                null,

        },

        // ==================================================
        // AI Consensus
        // ==================================================

        consensus: {

            score:
                null,

            confidence:
                null,

            agreement:
                null,

            enginesEvaluated: [],

            enginesSupporting: [],

            enginesOpposing: [],

            strengths: [],

            weaknesses: [],

            risks: [],

            convictionDrivers: [],

            monitoringPriorities: [],

            disagreements: [],

        },

        // ==================================================
        // AI Outputs
        // ==================================================

        investmentThesis:
            null,

        recommendation:
            null,

        entryValidation:
            null,

        positionHealth:
            null,

        protectionStrategy:
            null,

        exitDecision:
            null,

        tradeDecision:
            null,

        tradePlan:
            null,

        // ==================================================
        // Execution State
        // ==================================================

        execution: {

            approved:
                false,

            executed:
                false,

            skipped:
                false,

            executionState:
                "PENDING",

            startedAt:
                null,

            completedAt:
                null,

            transactionSignature:
                null,

            executionError:
                null,

        },

        // ==================================================
        // Decision Memory
        // ==================================================

        decisionMemory: {

            previousDecision:
                null,

            previousRecommendation:
                null,

            previousProtectionLevel:
                null,

            previousTradePlan:
                null,

        },

        // ==================================================
        // AI Evolution Memory
        // ==================================================

        aiMemory: {

            timeline: [],

            lastSnapshot:
                null,

            lastUpdated:
                null,

            version:
                1,

        },

        // ==================================================
        // Long-Term Learning
        // ==================================================

        learning: {

            enabled:
                true,

            historicalPattern:
                null,

            evidence:
                null,

            outcome:
                "PENDING",

            snapshotSaved:
                false,

            monitoringStarted:
                false,

            recommendationHistory: [],

        },

        // ==================================================
        // Review State
        // ==================================================

        review: {

            pending:
                false,

            events: [],

        },

        // ==================================================
        // Diagnostics
        // ==================================================

        diagnostics: {

            warnings: [],

            errors: [],

            debug: [],

        },

        // ==================================================
        // Engine Metrics
        // ==================================================

        engineMetrics: {

            total:
                0,

            completed:
                0,

            failed:
                0,

            current:
                null,

        },

        // ==================================================
        // Engine Runtime
        // ==================================================

        engines: {

            forecast: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            chart: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            momentum: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            velocity: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            liquidity: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            volume: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            holders: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            wallets: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            integrity: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            rugRisk: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            developer: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            historicalPattern: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            investmentThesis: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            recommendation: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            entryValidation: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            positionHealth: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            protectionStrategy: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            exitDecision: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            tradeDecision: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

            tradePlanning: {
                status: "PENDING",
                startedAt: null,
                completedAt: null,
                success: null,
                output: null,
            },

        },

        // ==================================================
        // Confidence
        // ==================================================

        confidence: {

            overall:
                null,

            entry:
                null,

            exit:
                null,

            conviction:
                null,

            grade:
                null,

            breakdown:
                {},

            methodologyVersion:
                null,

            degraded:
                false,

        },

        // ==================================================
        // Confidence Gaps
        // ==================================================

        confidenceGaps: {

            degradedConfidence:
                false,

            missingEngines: [],

            unavailableData: [],

        },

        // ==================================================
        // Final Result
        // ==================================================

        result: {

            success:
                null,

            verdict:
                null,

            reason:
                null,

            completedAt:
                null,

        },

        // ==================================================
        // Performance Metrics
        // ==================================================

        metrics: {

            pipelineDurationMs:
                null,

            aiProcessingMs:
                null,

            totalEngines:
                0,

            completedEngines:
                0,

            failedEngines:
                0,

        },

    };

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    createPipelineContext,

};