// ==========================================================
// InvestmentThesisBuilder
// ==========================================================
//
// Aggregates evidence produced by every AI engine into a
// unified investment thesis.
//
// Responsibilities
// ----------------
// ✔ Aggregate AI evidence
// ✔ Remove duplicate evidence
// ✔ Calculate weighted confidence
// ✔ Build investment strengths
// ✔ Build weaknesses
// ✔ Build risks
// ✔ Build assumptions
// ✔ Build monitoring priorities
// ✔ Build conviction drivers
// ✔ Generate investment summary
//
// NEVER
// -----
// ✘ Execute trades
// ✘ Fetch APIs
// ✘ Save MongoDB
// ✘ Send notifications
// ✘ Calculate indicators
//
// ==========================================================

import {

    setInvestmentThesis,

    setConfidence,

    addDebug,

} from "./AIContextUtils.js";

// ==========================================================
// Helpers
// ==========================================================

function normalizeArray(values = []) {

    if (!Array.isArray(values)) {

        return [];

    }

    return values

        .filter(Boolean)

        .map(value =>

            String(value).trim()

        )

        .filter(Boolean);

}

// ==========================================================
// Merge Unique
// ==========================================================

function mergeUnique(...arrays) {

    return [

        ...new Set(

            arrays

                .flat()

                .filter(Boolean)

                .map(item =>

                    String(item).trim()

                )

                .filter(Boolean)

        ),

    ];

}

// ==========================================================
// Collect Evidence
// ==========================================================

function collectEvidence(context) {

    if (

        !context ||

        !context.evidence

    ) {

        return [];

    }

 return Object.values(

    context.evidence

).filter(

    evidence =>

        evidence &&

        typeof evidence === "object"

);
}
// ==========================================================
// Calculate Confidence
// ==========================================================

function calculateConfidence(

    evidenceList

) {

    let weightedScore = 0;

    let totalWeight = 0;

    for (

        const evidence

        of evidenceList

    ) {

        const contribution =

            Number(

                evidence.confidenceContribution

            ) || 0;

        const weight =

            Number(

                evidence.confidenceWeight

            ) || 0;

        weightedScore +=

            contribution * weight;

        totalWeight +=

            weight;

    }

    if (

        totalWeight <= 0

    ) {

        return 0;

    }

    return Math.round(

        weightedScore /

        totalWeight

    );

}

// ==========================================================
// Strengths
// ==========================================================

function buildStrengths(

    evidenceList

) {

    return mergeUnique(

        ...evidenceList.map(

            evidence =>

                normalizeArray(

                    evidence.strengths

                )

        )

    );

}

// ==========================================================
// Weaknesses
// ==========================================================

function buildWeaknesses(

    evidenceList

) {

    return mergeUnique(

        ...evidenceList.map(

            evidence =>

                normalizeArray(

                    evidence.weaknesses

                )

        )

    );

}

// ==========================================================
// Risks
// ==========================================================

function buildRisks(

    evidenceList

) {

    return mergeUnique(

        ...evidenceList.map(

            evidence =>

                normalizeArray(

                    evidence.risks

                )

        )

    );

}

// ==========================================================
// Assumptions
// ==========================================================

function buildAssumptions(

    evidenceList

) {

    return mergeUnique(

        ...evidenceList.map(

            evidence =>

                normalizeArray(

                    evidence.assumptions

                )

        )

    );

}

// ==========================================================
// Invalidation Criteria
// ==========================================================

function buildInvalidationCriteria(

    evidenceList

) {

    return mergeUnique(

        ...evidenceList.map(

            evidence =>

                normalizeArray(

                    evidence.invalidationCriteria

                )

        )

    );

}

// ==========================================================
// Monitoring Priorities
// ==========================================================

function buildMonitoringPriorities(

    evidenceList

) {

    return mergeUnique(

        ...evidenceList.map(

            evidence =>

                normalizeArray(

                    evidence.monitoringPriorities

                )

        )

    );

}

// ==========================================================
// Conviction Drivers
// ==========================================================

function buildConvictionDrivers(

    evidenceList

) {

    return mergeUnique(

        ...evidenceList.map(

            evidence =>

                normalizeArray(

                    evidence.convictionDrivers

                )

        )

    );

}

// ==========================================================
// Generate Summary
// ==========================================================

function generateSummary({

    strengths,

    weaknesses,

    risks,

    assumptions,

    monitoringPriorities,

    confidence,

}) {

    const parts = [];

    if (confidence >= 80) {

        parts.push(

            "The investment thesis is strongly bullish."

        );

    }

    else if (confidence >= 60) {

        parts.push(

            "The investment thesis is moderately bullish."

        );

    }

    else if (confidence >= 40) {

        parts.push(

            "The investment thesis is neutral."

        );

    }

    else {

        parts.push(

            "The investment thesis is weak."

        );

    }

    if (strengths.length) {

        parts.push(

            `Primary strengths include ${strengths.slice(0, 3).join(", ")}.`

        );

    }

    if (weaknesses.length) {

        parts.push(

            `Key weaknesses include ${weaknesses.slice(0, 2).join(", ")}.`

        );

    }

    if (risks.length) {

        parts.push(

            `Primary risks include ${risks.slice(0, 2).join(", ")}.`

        );

    }

    if (assumptions.length) {

        parts.push(

            `The thesis assumes ${assumptions.slice(0, 2).join(", ")}.`

        );

    }

    if (monitoringPriorities.length) {

        parts.push(

            `Monitoring should focus on ${monitoringPriorities.slice(0, 3).join(", ")}.`

        );

    }

    return parts.join(" ");

}

// ==========================================================
// Build Investment Thesis
// ==========================================================

export function buildInvestmentThesis(
    context
) {

    if (!context) {

        throw new Error(
            "InvestmentThesisBuilder: context is required."
        );

    }

    const evidenceList =
        collectEvidence(context);

    const strengths =
        buildStrengths(
            evidenceList
        );

    const weaknesses =
        buildWeaknesses(
            evidenceList
        );

    const risks =
        buildRisks(
            evidenceList
        );

    const assumptions =
        buildAssumptions(
            evidenceList
        );

    const invalidationCriteria =
        buildInvalidationCriteria(
            evidenceList
        );

    const monitoringPriorities =
        buildMonitoringPriorities(
            evidenceList
        );

    const convictionDrivers =
        buildConvictionDrivers(
            evidenceList
        );

    const confidence =
        calculateConfidence(
            evidenceList
        );

   const summary =
    generateSummary({

        strengths,

        weaknesses,

        risks,

        assumptions,

        monitoringPriorities,

        confidence,

    });

    const thesis = {

        summary,

        strengths,

        weaknesses,

        risks,

        assumptions,

        invalidationCriteria,

        monitoringPriorities,

        convictionDrivers,

        confidence,

        createdAt: new Date(),

    };

    setInvestmentThesis(

        context,

        thesis

    );

    setConfidence(

        context,

        confidence

    );

    addDebug(

        context,

        "Investment thesis generated.",

        {

            confidence,

            strengths:
                strengths.length,

            weaknesses:
                weaknesses.length,

            risks:
                risks.length,

            assumptions:
                assumptions.length,

            monitoringPriorities:
                monitoringPriorities.length,

        }

    );

    return context;

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    buildInvestmentThesis,

};