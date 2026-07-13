/**
 * ==========================================================
 * AI Registry
 * ==========================================================
 *
 * Central plugin registry for every AI module.
 *
 * Responsibilities
 * ----------------
 * ✔ Register modules
 * ✔ Unregister modules
 * ✔ Enable / Disable modules
 * ✔ Version tracking
 * ✔ Priority ordering
 * ✔ Stage grouping
 * ✔ Registry diagnostics
 *
 * The orchestrator NEVER imports modules directly.
 * Everything comes through this registry.
 *
 * ==========================================================
 */

const STAGES = Object.freeze([
    "validation",
    "analysis",
    "scoring",
    "decision",
    "completion",
]);

const registry = Object.seal({

    validation: [],

    analysis: [],

    scoring: [],

    decision: [],

    completion: [],

});

// ==========================================================
// Validation
// ==========================================================

function validateModule(module) {

    if (!module) {
        throw new Error("AI module is required.");
    }

    if (!module.id) {
        throw new Error("Module id is required.");
    }

    if (!module.stage) {
        throw new Error(
            `Module "${module.id}" missing stage.`
        );
    }

    if (!STAGES.includes(module.stage)) {
        throw new Error(
            `Unknown stage "${module.stage}".`
        );
    }

    if (typeof module.execute !== "function") {
        throw new Error(
            `Module "${module.id}" must expose execute().`
        );
    }

}

// ==========================================================
// Register
// ==========================================================

export function registerModule(module) {

    validateModule(module);

    const stageModules =
        registry[module.stage];

    const exists =
        stageModules.find(
            m => m.id === module.id
        );

    if (exists) {

        throw new Error(
            `Module "${module.id}" already registered.`
        );

    }

    stageModules.push({

        id: module.id,

        name:
            module.name ||
            module.id,

        version:
            module.version ||
            "1.0.0",

        description:
            module.description ||
            "",

        author:
            module.author ||
            "Autoswaps",

        stage:
            module.stage,

        priority:
            module.priority ??
            100,

        critical:
            module.critical ??
            false,

        enabled:
            module.enabled ??
            true,

        tags:
            module.tags ??
            [],

        dependencies:
            module.dependencies ??
            [],

        metadata:
            module.metadata ??
            {},

        execute:
            module.execute,

    });

    stageModules.sort(
        (a, b) =>
            a.priority - b.priority
    );

}

// ==========================================================
// Unregister Module
// ==========================================================

export function unregisterModule(id) {

    for (const stage of STAGES) {

        registry[stage] = registry[stage].filter(

            module => module.id !== id

        );

    }

}

// ==========================================================
// Enable Module
// ==========================================================

export function enableModule(id) {

    const module = getModule(id);

    if (!module) {

        throw new Error(
            `Module "${id}" not found.`
        );

    }

    module.enabled = true;

    return module;

}

// ==========================================================
// Disable Module
// ==========================================================

export function disableModule(id) {

    const module = getModule(id);

    if (!module) {

        throw new Error(
            `Module "${id}" not found.`
        );

    }

    module.enabled = false;

    return module;

}

// ==========================================================
// Get Module
// ==========================================================

export function getModule(id) {

    for (const stage of STAGES) {

        const module = registry[stage].find(

            module => module.id === id

        );

        if (module) {

            return module;

        }

    }

    return null;

}

// ==========================================================
// Check Module Exists
// ==========================================================

export function hasModule(id) {

    return getModule(id) !== null;

}

// ==========================================================
// Get Modules By Stage
// ==========================================================

export function getStageModules(stage) {

    if (!STAGES.includes(stage)) {

        throw new Error(
            `Unknown stage "${stage}".`
        );

    }

    return [...registry[stage]];

}

// ==========================================================
// Get Enabled Modules By Stage
// ==========================================================

export function getEnabledModules(stage) {

    return getStageModules(stage)

        .filter(

            module => module.enabled

        );

}

// ==========================================================
// Get All Modules
// ==========================================================

export function getModules() {

    return STAGES.flatMap(

        stage => registry[stage]

    );

}

// ==========================================================
// Registry Validation
// ==========================================================

export function validateRegistry() {

    const errors = [];

    for (const stage of STAGES) {

        for (const module of registry[stage]) {

            if (!module.id) {

                errors.push(
                    `Module missing id in stage "${stage}".`
                );

            }

            if (typeof module.execute !== "function") {

                errors.push(
                    `Module "${module.id}" missing execute().`
                );

            }

            if (module.stage !== stage) {

                errors.push(
                    `Module "${module.id}" registered in wrong stage.`
                );

            }

        }

    }

    return {

        valid: errors.length === 0,

        errors,

    };

}

// ==========================================================
// Registry Statistics
// ==========================================================

export function getRegistryStats() {

    const modules = getModules();

    return {

        totalModules: modules.length,

        enabledModules:

            modules.filter(

                module => module.enabled

            ).length,

        disabledModules:

            modules.filter(

                module => !module.enabled

            ).length,

        criticalModules:

            modules.filter(

                module => module.critical

            ).length,

        stages: {

            validation:
                registry.validation.length,

            analysis:
                registry.analysis.length,

            scoring:
                registry.scoring.length,

            decision:
                registry.decision.length,

            completion:
                registry.completion.length,

        },

    };

}

// ==========================================================
// Registry Manifest
// ==========================================================

export function exportRegistryManifest() {

    return getModules().map(module => ({

        id: module.id,

        name: module.name,

        version: module.version,

        description: module.description,

        stage: module.stage,

        priority: module.priority,

        enabled: module.enabled,

        critical: module.critical,

        tags: [...module.tags],

        author: module.author,

    }));

}

// ==========================================================
// List Stages
// ==========================================================

export function listStages() {

    return [...STAGES];

}

// ==========================================================
// Clear Registry
// ==========================================================

export function clearRegistry() {

    for (const stage of STAGES) {

        registry[stage].length = 0;

    }

}

// ==========================================================
// Registry Health
// ==========================================================

export function getRegistryHealth() {

    const validation =
        validateRegistry();

    const stats =
        getRegistryStats();

    return {

        healthy: validation.valid,

        validation,

        stats,

        timestamp: new Date(),

    };

}

// ==========================================================
// Default Export
// ==========================================================

export default {

    registerModule,

    unregisterModule,

    enableModule,

    disableModule,

    hasModule,

    getModule,

    getModules,

    getStageModules,

    getEnabledModules,

    validateRegistry,

    getRegistryStats,

    exportRegistryManifest,

    listStages,

    clearRegistry,

    getRegistryHealth,

};