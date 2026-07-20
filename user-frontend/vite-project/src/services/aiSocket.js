// src/services/aiSocket.js

import { getSocket } from "./socket";

let listenersAttached = false;
let activeHandlers = [];

/**
 * Attach AI-related socket listeners to the existing Socket.IO connection.
 * This function reuses the singleton socket created by socket.js.
 */
export function attachAIListeners(ai) {
    const socket = getSocket();

    if (!socket) {
        console.warn("[AI Socket] Socket has not been initialized.");
        return false;
    }

    if (listenersAttached) {
        return true;
    }

    listenersAttached = true;

    const {
        updateSystem,
        updatePortfolio,
        updateMarket,
        updatePipeline,
        updatePositionMetrics,
        updateAnalysis,
        updateDiagnostics,
        updateLearning,
        updateAIState,
        addActivity,
    } = ai;

    updateDiagnostics({
        socketConnected: socket.connected,
        reconnecting: false,
        lastHeartbeat: socket.connected ? Date.now() : null,
    });

    const handlers = [
        {
            event: "ai_system",
            handler: updateSystem,
        },

        {
            event: "ai_portfolio",
            handler: updatePortfolio,
        },

        {
            event: "ai_market",
            handler: updateMarket,
        },

        {
            event: "ai_pipeline",
            handler: updatePipeline,
        },

        {
            event: "ai_positions",
            handler: updatePositionMetrics,
        },

        {
            event: "ai_analysis",
            handler: updateAnalysis,
        },

        {
            event: "ai_diagnostics",
            handler: updateDiagnostics,
        },

        {
            event: "ai_learning",
            handler: updateLearning,
        },

        {
            event: "ai_activity",
            handler: addActivity,
        },

        // Full-state synchronization
        {
            event: "ai_state",
            handler: updateAIState,
        },

        {
            event: "connect",
            handler: () => {
                updateDiagnostics({
                    socketConnected: true,
                    reconnecting: false,
                    lastHeartbeat: Date.now(),
                });
            },
        },

        {
            event: "disconnect",
            handler: () => {
                updateDiagnostics({
                    socketConnected: false,
                    reconnecting: false,
                });
            },
        },

        {
            event: "reconnect_attempt",
            handler: () => {
                updateDiagnostics({
                    reconnecting: true,
                });
            },
        },

        {
            event: "reconnect",
            handler: () => {
                updateDiagnostics({
                    socketConnected: true,
                    reconnecting: false,
                    lastHeartbeat: Date.now(),
                });
            },
        },
    ];

    handlers.forEach(({ event, handler }) => {
        socket.on(event, handler);
    });

    activeHandlers = handlers;

    console.log("[AI Socket] AI listeners attached.");

    return true;
}

/**
 * Remove all AI socket listeners.
 */
export function detachAIListeners() {
    const socket = getSocket();

    if (!socket) {
        listenersAttached = false;
        activeHandlers = [];
        return false;
    }

    activeHandlers.forEach(({ event, handler }) => {
        socket.off(event, handler);
    });

    activeHandlers = [];
    listenersAttached = false;

    console.log("[AI Socket] AI listeners detached.");

    return true;
}