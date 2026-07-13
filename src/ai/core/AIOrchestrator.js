/**
 * ==========================================================
 * AI Orchestrator
 * ==========================================================
 *
 * Coordinates execution of the complete AI pipeline.
 *
 * Responsibilities
 * ----------------
 * ✔ Validate AI Context
 * ✔ Execute AI pipeline stages
 * ✔ Coordinate registered AI modules
 * ✔ Track runtime diagnostics
 * ✔ Return completed AI Context
 *
 * NEVER
 * -----
 * ✘ Execute trades
 * ✘ Save MongoDB
 * ✘ Publish notifications
 * ✘ Access Redis
 *
 * ==========================================================
 */

import {

    getEnabledModules,

} from "./AIRegistry.js";

import {

    validateContext,

    updateLifecycle,

    addDebug,

    addError,

    runEngine,

} from "./AIContextUtils.js";

// ==========================================================
// Pipeline Stages
// ==========================================================

const PIPELINE = Object.freeze({

    VALIDATION: "validation",

    ANALYSIS: "analysis",

    DECISION: "decision",

    COMPLETION: "completion",

});

const PIPELINE_ORDER = Object.freeze([

    PIPELINE.VALIDATION,

    PIPELINE.ANALYSIS,

    PIPELINE.DECISION,

    PIPELINE.COMPLETION,

]);

// ==========================================================
// Helpers
// ==========================================================

function isParallelStage(
    stage
) {

    return stage === PIPELINE.ANALYSIS;

}

// ==========================================================
// Execute Modules
// ==========================================================

async function executeModules(
    context,
    stage,
    modules,
    pipeline
) {

    if (!modules.length) {

        pipeline.modulesSkipped++;

        addDebug(

            context,

            `No modules registered for stage "${stage}".`

        );

        return;

    }

    if (isParallelStage(stage)) {

        const results = await Promise.allSettled(

            modules.map(async (module) => {

                pipeline.modulesExecuted++;

                return runEngine(

                    context,

                    module.id,

                    () => module.execute(context),

                    module.critical

                );

            })

        );

        for (let i = 0; i < results.length; i++) {

            const result = results[i];

            const module = modules[i];

            if (result.status === "rejected") {

                pipeline.modulesFailed++;

                if (module.critical) {

                    throw result.reason;

                }

            }

        }

        return;

    }

    for (const module of modules) {

        pipeline.modulesExecuted++;

        try {

            await runEngine(

                context,

                module.id,

                () => module.execute(context),

                module.critical

            );

        }

        catch (error) {

            pipeline.modulesFailed++;

            throw error;

        }

    }

}
// ==========================================================
// Execute Stage
// ==========================================================

async function executeStage(
    context,
    stage,
pipeline
) {

    const modules =
        getEnabledModules(stage);

    updateLifecycle(

        context,

        "RUNNING",

        stage

    );

    addDebug(

        context,

        `Executing stage "${stage}".`,

        {

            moduleCount:

                modules.length,

        }

    );

    await executeModules(

        context,

        stage,

        modules,
       pipeline
    

    );

    return context;

}

// ==========================================================
// Execute Pipeline
// ==========================================================

async function executePipeline(
    context,
    pipeline
) {

    for (const stage of PIPELINE_ORDER) {

    pipeline.stagesExecuted.push(
        stage
    );

    await executeStage(

        context,

        stage,

        pipeline

    );

}

    return context;

}

// ==========================================================
// Build Diagnostics
// ==========================================================

function buildDiagnostics(
    context,
    pipeline
) {

    context.runtime.orchestratorLatencyMs =
        pipeline.durationMs;

    context.runtime.pipelineCompletedAt =
        pipeline.completedAt;


    addDebug(

        context,

        "AI pipeline completed.",

        {

            durationMs:
                pipeline.durationMs,

            completedAt:
                pipeline.completedAt,

            stagesExecuted:
                pipeline.stagesExecuted,

            modulesExecuted:
                pipeline.modulesExecuted,

            modulesFailed:
                pipeline.modulesFailed,

            modulesSkipped:
                pipeline.modulesSkipped,

        }

    );

}

   

// ==========================================================
// Pipeline Failure
// ==========================================================

function handlePipelineFailure(
    context,
    error
) {

    updateLifecycle(

        context,

        "FAILED",

        "PIPELINE"

    );

    addError(

        context,

        error

    );

    addDebug(

        context,

        "AI pipeline aborted.",

        {

            reason:

                error?.message ||

                String(error),

        }

    );

    throw error;

}

// ==========================================================
// Pipeline Success
// ==========================================================

function handlePipelineSuccess(
    context
) {

    updateLifecycle(

        context,

        "COMPLETED",

        "PIPELINE"

    );

    addDebug(

        context,

        "AI pipeline completed successfully."

    );

}

// ==========================================================
// Run AI
// ==========================================================

export async function runAI(
    context
) {

    const pipeline = Object.seal({

    startedAt: new Date(),

    completedAt: null,

    durationMs: null,

    stagesExecuted: [],

    modulesExecuted: 0,

    modulesFailed: 0,

    modulesSkipped: 0,

});

context.runtime.pipeline = pipeline;

    try {

        validateContext(
            context
        );

        updateLifecycle(

            context,

            "RUNNING",

            "PIPELINE"

        );

        await executePipeline(

    context,

    pipeline

);

        pipeline.completedAt =
            new Date();

        pipeline.durationMs =

            pipeline.completedAt.getTime() -

            pipeline.startedAt.getTime();

        buildDiagnostics(

            context,

            pipeline

        );

        handlePipelineSuccess(
            context
        );

        return context;

    }

    catch (error) {

        pipeline.completedAt =
            new Date();

        pipeline.durationMs =

            pipeline.completedAt.getTime() -

            pipeline.startedAt.getTime();

        handlePipelineFailure(

            context,

            error

        );

    }

}
// ==========================================================
// Default Export
// ==========================================================

export default {

    runAI,

};