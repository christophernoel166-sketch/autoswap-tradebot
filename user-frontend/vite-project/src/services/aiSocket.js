// src/services/aiSocket.js

import { getSocket } from "./socket";

let listenersAttached = false;
let activeHandlers = [];
let activeManagerHandlers = [];

// =====================================================
// ATTACH AI LISTENERS
// =====================================================

export function attachAIListeners(aiRef) {

    const socket =
        getSocket();

    console.log(
        "🧠 [AI Socket] attachAIListeners()",
        {
            socketExists:
                !!socket,

            socketConnected:
                socket?.connected,

            socketId:
                socket?.id,

            listenersAttached,
        }
    );

    if (!socket) {

        console.warn(
            "[AI Socket] Socket has not been initialized."
        );

        return false;
    }

    // =================================================
    // IMPORTANT
    //
    // If listeners already exist, remove them first.
    //
    // This prevents handlers from keeping an old
    // useAI() instance.
    // =================================================

    if (listenersAttached) {

        detachAIListeners();
    }

    // =================================================
    // AI FUNCTIONS
    // =================================================

const updateSystem = (...args) =>
    aiRef.current?.updateSystem?.(...args);

const updatePortfolio = (...args) =>
    aiRef.current?.updatePortfolio?.(...args);

const updateMarket = (...args) =>
    aiRef.current?.updateMarket?.(...args);

const updatePipeline = (...args) =>
    aiRef.current?.updatePipeline?.(...args);

const updatePositionMetrics = (...args) =>
    aiRef.current?.updatePositionMetrics?.(...args);

const updateAnalysis = (...args) =>
    aiRef.current?.updateAnalysis?.(...args);

const updateDiagnostics = (...args) =>
    aiRef.current?.updateDiagnostics?.(...args);

const updateLearning = (...args) =>
    aiRef.current?.updateLearning?.(...args);

const updateAIState = (...args) =>
    aiRef.current?.updateAIState?.(...args);

const addActivity = (...args) =>
    aiRef.current?.addActivity?.(...args);

    // =================================================
    // INITIAL DIAGNOSTICS
    // =================================================

    updateDiagnostics({
        socketConnected:
            socket.connected,

        reconnecting:
            false,

        lastHeartbeat:
            socket.connected
                ? Date.now()
                : null,
    });

    // =================================================
    // SOCKET EVENTS
    // =================================================

    const handlers = [

        // ---------------------------------------------
        // SYSTEM
        // ---------------------------------------------

        {
            event: "ai_system",

            handler:
                updateSystem,
        },

        // ---------------------------------------------
        // PORTFOLIO
        // ---------------------------------------------

        {
            event: "ai_portfolio",

            handler:
                updatePortfolio,
        },

        // ---------------------------------------------
        // MARKET
        // ---------------------------------------------

        {
            event: "ai_market",

            handler:
                updateMarket,
        },

        // ---------------------------------------------
        // PIPELINE
        // ---------------------------------------------

        {
            event: "ai_pipeline",

            handler:
                updatePipeline,
        },

        // ---------------------------------------------
        // POSITIONS
        // ---------------------------------------------

        {
            event: "ai_positions",

            handler:
                updatePositionMetrics,
        },

        // ---------------------------------------------
        // ANALYSIS
        // ---------------------------------------------

        {
            event: "ai_analysis",

            handler:
                updateAnalysis,
        },

        // ---------------------------------------------
        // DIAGNOSTICS
        // ---------------------------------------------

        {
            event: "ai_diagnostics",

            handler:
                updateDiagnostics,
        },

        // ---------------------------------------------
        // LEARNING
        // ---------------------------------------------

        {
            event: "ai_learning",

            handler:
                updateLearning,
        },

        // ---------------------------------------------
        // ACTIVITY
        // ---------------------------------------------

        {
            event: "ai_activity",

            handler:
                addActivity,
        },

        // ---------------------------------------------
        // FULL AI STATE
        // ---------------------------------------------

        {
            event: "ai_state",

            handler: (payload) => {

                console.log(
                    "🧠 [AI Socket] RECEIVED ai_state",
                    {
                        payload,
                        socketId:
                            socket.id,
                        wallet:
                            payload
                                ?.walletAddress ??
                            null,
                        recommendation:
                            payload
                                ?.analysis
                                ?.recommendation ??
                            payload
                                ?.aiRecommendation ??
                            null,
                        confidence:
                            payload
                                ?.analysis
                                ?.confidence ??
                            payload
                                ?.aiConfidence ??
                            0,
                    }
                );

                updateAIState(
                    payload
                );
            },
        },

        // ---------------------------------------------
        // CONNECT
        // ---------------------------------------------

        {
            event: "connect",

            handler: () => {

                console.log(
                    "🧠 [AI Socket] CONNECT EVENT"
                );

                updateDiagnostics({
                    socketConnected:
                        true,

                    reconnecting:
                        false,

                    lastHeartbeat:
                        Date.now(),
                });
            },
        },

        // ---------------------------------------------
        // DISCONNECT
        // ---------------------------------------------

        {
            event: "disconnect",

            handler: (reason) => {

                console.log(
                    "🧠 [AI Socket] DISCONNECT EVENT",
                    {
                        reason,
                    }
                );

                updateDiagnostics({
                    socketConnected:
                        false,

                    reconnecting:
                        false,
                });
            },
        },
    ];

    // =================================================
    // REGISTER SOCKET HANDLERS
    // =================================================

    handlers.forEach(
        ({
            event,
            handler,
        }) => {

            socket.on(
                event,
                handler
            );
        }
    );

    activeHandlers =
        handlers;

    // =================================================
    // SOCKET.IO MANAGER EVENTS
    // =================================================

    const managerHandlers = [

        // ---------------------------------------------
        // RECONNECT ATTEMPT
        // ---------------------------------------------

        {
            event:
                "reconnect_attempt",

            handler: () => {

                console.log(
                    "🧠 [AI Socket] RECONNECT ATTEMPT"
                );

                updateDiagnostics({
                    reconnecting:
                        true,
                });
            },
        },

        // ---------------------------------------------
        // RECONNECT
        // ---------------------------------------------

        {
            event:
                "reconnect",

            handler: () => {

                console.log(
                    "🧠 [AI Socket] RECONNECTED"
                );

                updateDiagnostics({
                    socketConnected:
                        true,

                    reconnecting:
                        false,

                    lastHeartbeat:
                        Date.now(),
                });
            },
        },

        // ---------------------------------------------
        // RECONNECT ERROR
        // ---------------------------------------------

        {
            event:
                "reconnect_error",

            handler: (error) => {

                console.error(
                    "❌ [AI Socket] RECONNECT ERROR",
                    {
                        message:
                            error?.message,
                    }
                );
            },
        },

        // ---------------------------------------------
        // RECONNECT FAILED
        // ---------------------------------------------

        {
            event:
                "reconnect_failed",

            handler: () => {

                console.error(
                    "❌ [AI Socket] RECONNECT FAILED"
                );
            },
        },
    ];

    managerHandlers.forEach(
        ({
            event,
            handler,
        }) => {

            socket.io.on(
                event,
                handler
            );
        }
    );

    activeManagerHandlers =
        managerHandlers;

    listenersAttached =
        true;

    console.log(
        "✅ [AI Socket] AI listeners attached.",
        {
            socketId:
                socket.id,

            socketConnected:
                socket.connected,

            socketEvents:
                activeHandlers.length,

            managerEvents:
                activeManagerHandlers.length,
        }
    );

    return true;
}

// =====================================================
// DETACH AI LISTENERS
// =====================================================

export function detachAIListeners() {

    const socket =
        getSocket();

    console.log(
        "🧠 [AI Socket] detachAIListeners()",
        {
            socketExists:
                !!socket,

            socketConnected:
                socket?.connected,

            socketId:
                socket?.id,

            listenersAttached,
        }
    );

    if (!socket) {

        listenersAttached =
            false;

        activeHandlers =
            [];

        activeManagerHandlers =
            [];

        return false;
    }

    // =================================================
    // REMOVE SOCKET EVENTS
    // =================================================

    activeHandlers.forEach(
        ({
            event,
            handler,
        }) => {

            socket.off(
                event,
                handler
            );
        }
    );

    // =================================================
    // REMOVE MANAGER EVENTS
    // =================================================

    activeManagerHandlers.forEach(
        ({
            event,
            handler,
        }) => {

            socket.io.off(
                event,
                handler
            );
        }
    );

    activeHandlers =
        [];

    activeManagerHandlers =
        [];

    listenersAttached =
        false;

    console.log(
        "✅ [AI Socket] AI listeners detached."
    );

    return true;
}