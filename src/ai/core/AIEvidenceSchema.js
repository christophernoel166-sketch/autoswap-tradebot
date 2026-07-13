import mongoose from "mongoose";

// =====================================================
// AI ENGINE
// =====================================================

const AIEngineSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    version: {
      type: String,
      default: "1.0.0",
    },
  },
  {
    _id: false,
  }
);

// =====================================================
// AI SCORE
// =====================================================

const AIScoreSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    status: {
      type: String,
      default: null,
    },

    trend: {
      type: String,
      enum: [
        "STRONGLY_IMPROVING",
        "IMPROVING",
        "STABLE",
        "WEAKENING",
        "STRONGLY_WEAKENING",
      ],
      default: "STABLE",
    },
  },
  {
    _id: false,
  }
);

// =====================================================
// AI COMPONENT
// =====================================================

const AIComponentSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      default: null,
    },

    confidence: {
      type: Number,
      default: null,
    },

    trend: {
      type: String,
      default: "STABLE",
    },

    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    reasons: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

// =====================================================
// UNIVERSAL AI EVIDENCE
// =====================================================

const AIEvidenceSchema = new mongoose.Schema(
  {
    // --------------------------------------------
    // Engine Metadata
    // --------------------------------------------

    engine: {
      type: AIEngineSchema,
      required: true,
    },

    // --------------------------------------------
    // Overall AI Verdict
    // --------------------------------------------

    overall: {
      type: AIScoreSchema,
      required: true,
    },

    // --------------------------------------------
    // Component Intelligence
    // --------------------------------------------

    components: {

      liquidity: AIComponentSchema,

      volume: AIComponentSchema,

      momentum: AIComponentSchema,

      holders: AIComponentSchema,

      wallets: AIComponentSchema,

      chart: AIComponentSchema,

      risk: AIComponentSchema,

      forecast: AIComponentSchema,

    },

    // --------------------------------------------
    // Raw Engine Output
    // --------------------------------------------

    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // --------------------------------------------
    // Human Explanation
    // --------------------------------------------

    reasons: {
      type: [String],
      default: [],
    },

// --------------------------------------------
// Investment Thesis Building Blocks
// --------------------------------------------

strengths: {
  type: [String],
  default: [],
},

weaknesses: {
  type: [String],
  default: [],
},

risks: {
  type: [String],
  default: [],
},

assumptions: {
  type: [String],
  default: [],
},

invalidationCriteria: {
  type: [String],
  default: [],
},

monitoringPriorities: {
  type: [String],
  default: [],
},

convictionDrivers: {
  type: [String],
  default: [],
},

summary: {
  type: String,
  trim: true,
  default: "",
},

// --------------------------------------------
// Confidence Contribution
// --------------------------------------------

confidenceContribution: {
  type: Number,
  min: 0,
  max: 100,
  default: 0,
},

confidenceWeight: {
  type: Number,
  min: 0,
  max: 1,
  default: 0,
},


    // --------------------------------------------
    // Extra Information
    // --------------------------------------------

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // --------------------------------------------
    // Timestamp
    // --------------------------------------------

    collectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

export default AIEvidenceSchema;