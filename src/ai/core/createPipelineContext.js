/**
 * ==========================================================
 * Create Pipeline Context
 * ==========================================================
 *
 * Creates a standardized AI context shared by every
 * AI pipeline.
 *
 * Responsibilities
 * ----------------
 * ✔ Normalize trade requests
 * ✔ Initialize pipeline state
 * ✔ Initialize execution state
 * ✔ Initialize metadata
 * ✔ Initialize AI outputs
 * ✔ Initialize telemetry
 *
 * NEVER
 * -----
 * ✘ Execute AI
 * ✘ Buy
 * ✘ Sell
 * ✘ Call APIs
 * ✘ Modify blockchain
 *
 * ==========================================================
 */

export function createPipelineContext(tradeRequest = {}) {

    if (!tradeRequest) {

        throw new Error(
            "Pipeline context requires a trade request."
        );

    }

  const now = new Date();

const requestId =
    tradeRequest.requestId ??
    crypto.randomUUID();

const action =
    tradeRequest.action ?? "BUY";

const walletAddress =
    tradeRequest.walletAddress ??
    tradeRequest.user?.walletAddress ??
    null;

const mint =
    tradeRequest.mint ??
    tradeRequest.token?.mint ??
    null;

return {

    // ==================================================
    // Context Metadata
    // ==================================================

    contextVersion: "2.0.0",

    requestId,

    createdAt: now,

    // ==================================================
    // Original Request
    // ==================================================

    request: {

        ...tradeRequest,

    },


// ==================================================
// Normalized Objects
// ==================================================

user:

    tradeRequest.user ?? null,

token: {

    mint,

},

trade: {

    action,

    amount:

        tradeRequest.amount ?? null,

    source:

        tradeRequest.source ?? "UNKNOWN",

},

    // ==================================================
    // Backward Compatibility
    // ==================================================

    ...tradeRequest,

    walletAddress,

    mint,

    action,

       // ==================================================
// Pipeline State
// ==================================================

pipeline: {

    name:
        action === "SELL"
            ? "EXIT_PIPELINE"
            : "ENTRY_PIPELINE",

    version: "2.0.0",

    stage: "INITIALIZED",

    status: "RUNNING",

    currentEngine: null,

    progress: 0,

    startedAt: now,

    completedAt: null,

},

pipelineHistory: [],

// ==================================================
// Lifecycle
// ==================================================

lifecycle: {

    state: "INITIALIZED",

    currentPhase: "STARTUP",

    stages: [],

    lastUpdated: now,

},

// ==================================================
// Timeline
// ==================================================

timeline: [],

// ==================================================
// Runtime
// ==================================================

runtime: {

    startedAt: now,

    updatedAt: now,

    completedAt: null,

    durationMs: null,

},

// ==================================================
// Runtime Flags
// ==================================================

flags: {

    completed: false,

    frozen: false,

    aiReviewed: false,

    simulation: false,

},

     
        // ==================================================
        // Metadata
        // ==================================================

       metadata: {

    aiReviewed: false,

    pipelineVersion: "2.0.0",

    ...(tradeRequest.metadata || {}),

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

    approved: false,

    executed: false,

    skipped: false,

    executionState: "PENDING",

    startedAt: null,

    completedAt: null,

    transactionSignature: null,

    executionError: null,

},

// ==================================================
// Decision Memory
// ==================================================

decisionMemory: {

    previousDecision: null,

    previousRecommendation: null,

    previousProtectionLevel: null,

    previousTradePlan: null,

},

        // ==================================================
        // Review State
        // ==================================================

      review: {

    pending: false,

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

    total: 0,

    completed: 0,

    failed: 0,

    current: null,

},

// ==================================================
// Engine Runtime
// ==================================================

engines: {

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

    overall: null,

    entry: null,

    exit: null,

    conviction: null,

},

confidenceGaps: {

    degradedConfidence: false,

    missingEngines: [],

    unavailableData: [],

},

// ==================================================
// AI Storage
// ==================================================

analyses: {},

evidence: {},

// ==================================================
// Pipeline Result
// ==================================================

result: {

    success: null,

    verdict: null,

    reason: null,

    completedAt: null,

},

        // ==================================================
        // Performance Metrics
        // ==================================================

        metrics: {

    pipelineDurationMs: null,

    aiProcessingMs: null,

    totalEngines: 0,

    completedEngines: 0,

    failedEngines: 0,

},

    };

}



export default {

    createPipelineContext,

};