// src/services/aiSocket.js

import { getSocket } from "./socket";

let listenersAttached = false;
let activeHandlers = [];

/**
 * Attach AI-related socket listeners to the existing Socket.IO connection.
 * This function does NOT create a socket. It reuses the singleton socket
 * created by socket.js.
 */
export function attachAIListeners(ai) {
    const socket = getSocket();

    if (!socket) {
        console.warn(
            "[AI Socket] Socket has not been initialized."
        );
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
        addActivity,
        updateDiagnostics,
    } = ai;

updateDiagnostics({
    socketConnected: socket.connected,
    reconnecting: false,
    lastHeartbeat: socket.connected
        ? Date.now()
        : null,
});

    const handlers = [
        {
            event: "ai_system",
            handler: (payload) => {
                updateSystem(payload);
            },
        },

        {
            event: "ai_portfolio",
            handler: (payload) => {
                updatePortfolio(payload);
            },
        },

        {
            event: "ai_market",
            handler: (payload) => {
                updateMarket(payload);
            },
        },

        {
            event: "ai_pipeline",
            handler: (payload) => {
                updatePipeline(payload);
            },
        },

        {
            event: "ai_positions",
            handler: (payload) => {
                updatePositionMetrics(payload);
            },
        },

        {
            event: "ai_activity",
            handler: (payload) => {
                addActivity(payload);
            },
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

    activeHandlers.forEach(
        ({ event, handler }) => {
            socket.off(event, handler);
        }
    );

    activeHandlers = [];
    listenersAttached = false;

    console.log(
        "[AI Socket] AI listeners detached."
    );
return true;
}