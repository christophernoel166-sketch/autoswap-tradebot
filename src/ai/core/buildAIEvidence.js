/**
 * ==========================================================
 * Build AI Evidence
 * ==========================================================
 *
 * Standardizes the output of every AI engine.
 *
 * Responsibilities
 * ----------------
 * ✔ Normalize engine metadata
 * ✔ Normalize score
 * ✔ Normalize confidence
 * ✔ Normalize evidence collections
 * ✔ Preserve raw engine evidence
 * ✔ Produce a canonical AI evidence object
 *
 * NEVER
 * -----
 * ✘ Calculate global AI confidence
 * ✘ Generate final recommendation
 * ✘ Query databases
 * ✘ Call APIs
 * ✘ Execute trades
 *
 * ==========================================================
 */

import {
    normalizeScore,
    normalizeConfidence,
    safeNumber,
} from "./AIUtils.js";

function normalizeArray(value) {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(Boolean)
        .map(String);

}

function normalizeObject(value) {

    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return {};
    }

    return {
        ...value,
    };

}

export function buildAIEvidence({

    engine,

    score = null,

    confidence = null,

    status = null,

    trend = "STABLE",

    evidence = {},

    reasons = [],

    strengths = [],

    weaknesses = [],

    risks = [],

    assumptions = [],

    invalidationCriteria = [],

    monitoringPriorities = [],

    convictionDrivers = [],

    summary = "",

    confidenceContribution = null,

    confidenceWeight = 0,

    metadata = {},

}) {

    const normalizedScore =
        score === null || score === undefined
            ? null
            : normalizeScore(score);

    const normalizedConfidence =
        confidence === null ||
        confidence === undefined
            ? null
            : normalizeConfidence(confidence);

    const normalizedContribution =
        confidenceContribution === null ||
        confidenceContribution === undefined
            ? normalizedScore ?? 0
            : normalizeConfidence(
                confidenceContribution
            );

    return {

        engine: {

            id:
                engine?.id ??
                "unknown",

            name:
                engine?.name ??
                engine?.id ??
                "Unknown AI Engine",

            version:
                engine?.version ??
                "1.0.0",

        },

        overall: {

            score:
                normalizedScore,

            confidence:
                normalizedConfidence,

            status:
                status ??
                null,

            trend:
                trend ??
                "STABLE",

        },

        evidence:
            normalizeObject(
                evidence
            ),

        reasons:
            normalizeArray(
                reasons
            ),

        strengths:
            normalizeArray(
                strengths
            ),

        weaknesses:
            normalizeArray(
                weaknesses
            ),

        risks:
            normalizeArray(
                risks
            ),

        assumptions:
            normalizeArray(
                assumptions
            ),

        invalidationCriteria:
            normalizeArray(
                invalidationCriteria
            ),

        monitoringPriorities:
            normalizeArray(
                monitoringPriorities
            ),

        convictionDrivers:
            normalizeArray(
                convictionDrivers
            ),

        summary:
            typeof summary === "string"
                ? summary.trim()
                : "",

        confidenceContribution:
            normalizedContribution,

        confidenceWeight:
            Math.max(
                0,
                safeNumber(
                    confidenceWeight
                )
            ),

        metadata:
            normalizeObject(
                metadata
            ),

        collectedAt:
            new Date(),

    };

}

export default {

    buildAIEvidence,

};