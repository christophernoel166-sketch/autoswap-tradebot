// src/services/aiStateSocketBridge.js

import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// =====================================================
// REDIS CHANNEL
// =====================================================

const AI_STATE_CHANNEL =
    "autoswap:ai-state";

// =====================================================
// LATEST AI STATE REDIS KEY PREFIX
// =====================================================
//
// Each wallet gets its own latest-state key:
//
// autoswap:ai-state:latest:<walletAddress>
//
// This allows the API service to recover the latest
// AI state even if the frontend was disconnected when
// the AI update happened.
// =====================================================

const AI_LATEST_STATE_PREFIX =
    "autoswap:ai-state:latest:";

// =====================================================
// IN-MEMORY CACHE
// =====================================================
//
// Fast access for wallet joins.
//
// Redis remains the persistent source for the latest
// state across API-service restarts.
// =====================================================

const latestAIStates = new Map();

// =====================================================
// REDIS CLIENTS
// =====================================================
//
// subscriber:
//   Used ONLY for Redis SUBSCRIBE.
//
// stateRedis:
//   Used for normal Redis GET/SET operations.
//
// A Redis connection that is in subscriber mode should
// not also be used for normal commands.
// =====================================================

let subscriber = null;
let stateRedis = null;

// =====================================================
// GET REDIS KEY
// =====================================================

function latestStateKey(walletAddress) {

    return (
        `${AI_LATEST_STATE_PREFIX}${walletAddress}`
    );
}

// =====================================================
// START AI STATE SOCKET BRIDGE
// =====================================================
//
// Runs ONLY inside the API SERVICE.
//
// Flow:
//
// Bot Service
//      ↓
// Redis Pub/Sub
//      ↓
// AI Socket Bridge
//      ↓
// save latest state
//      ↓
// Socket.IO wallet room
//      ↓
// Frontend
//
// If frontend is disconnected:
//
// Bot Service
//      ↓
// Redis
//      ↓
// AI Socket Bridge
//      ↓
// latest state saved
//
// Later:
//
// Frontend connects
//      ↓
// join-wallet
//      ↓
// latest state retrieved
//      ↓
// frontend receives ai_state
// =====================================================

export function startAIStateSocketBridge(
    io
) {

    if (!io) {

        throw new Error(
            "Socket.IO instance is required."
        );

    }

    const {
        REDIS_URL,
    } = process.env;

    if (!REDIS_URL) {

        throw new Error(
            "REDIS_URL is not set."
        );

    }

    // =================================================
    // Prevent duplicate initialization
    // =================================================

    if (
        subscriber ||
        stateRedis
    ) {

        console.warn(
            "⚠️ AI Socket Bridge already initialized."
        );

        return subscriber;
    }

    // =================================================
    // Redis subscriber
    // =================================================

    subscriber =
        new Redis(
            REDIS_URL,
            {
                maxRetriesPerRequest:
                    null,

                enableReadyCheck:
                    false,

                lazyConnect:
                    false,

                tls: {},
            }
        );

    // =================================================
    // Redis state client
    // =================================================

    stateRedis =
        new Redis(
            REDIS_URL,
            {
                maxRetriesPerRequest:
                    null,

                enableReadyCheck:
                    false,

                lazyConnect:
                    false,

                tls: {},
            }
        );

    // =================================================
    // SUBSCRIBER EVENTS
    // =================================================

    subscriber.on(
        "connect",
        () => {

            console.log(
                "✅ AI Socket Bridge Redis subscriber connected"
            );

        }
    );

    subscriber.on(
        "ready",
        () => {

            console.log(
                "✅ AI Socket Bridge Redis subscriber ready"
            );

        }
    );

    subscriber.on(
        "error",
        (err) => {

            console.error(
                "❌ AI Socket Bridge Redis subscriber error:",
                err?.message || err
            );

        }
    );

    subscriber.on(
        "close",
        () => {

            console.warn(
                "⚠️ AI Socket Bridge Redis subscriber closed"
            );

        }
    );

    subscriber.on(
        "reconnecting",
        () => {

            console.warn(
                "🔄 AI Socket Bridge Redis subscriber reconnecting..."
            );

        }
    );

    // =================================================
    // STATE REDIS EVENTS
    // =================================================

    stateRedis.on(
        "connect",
        () => {

            console.log(
                "✅ AI Socket Bridge Redis state client connected"
            );

        }
    );

    stateRedis.on(
        "ready",
        () => {

            console.log(
                "✅ AI Socket Bridge Redis state client ready"
            );

        }
    );

    stateRedis.on(
        "error",
        (err) => {

            console.error(
                "❌ AI Socket Bridge Redis state client error:",
                err?.message || err
            );

        }
    );

    // =================================================
    // SUBSCRIBE
    // =================================================

    subscriber.subscribe(
        AI_STATE_CHANNEL,
        (err) => {

            if (err) {

                console.error(
                    "❌ Failed to subscribe to AI state channel:",
                    err
                );

                return;
            }

            console.log(
                `✅ AI Socket Bridge subscribed to ${AI_STATE_CHANNEL}`
            );

        }
    );

    // =================================================
    // RECEIVE AI STATE
    // =================================================

    subscriber.on(
        "message",
        async (
            channel,
            message
        ) => {

            if (
                channel !==
                AI_STATE_CHANNEL
            ) {

                return;
            }

            let parsed;

            try {

                parsed =
                    JSON.parse(message);

            } catch (err) {

                console.error(
                    "❌ Invalid AI state Redis message:",
                    err?.message || err
                );

                return;
            }

            const {
                walletAddress,
                events,
                state,
                timestamp,
            } = parsed;

            if (
                !walletAddress
            ) {

                console.warn(
                    "⚠️ AI state message missing walletAddress"
                );

                return;
            }

            const room =
                `wallet:${walletAddress}`;

            // =================================================
            // SAVE LATEST STATE
            // =================================================

            if (state) {

                latestAIStates.set(
                    walletAddress,
                    state
                );

                try {

                    await stateRedis.set(
                        latestStateKey(
                            walletAddress
                        ),
                        JSON.stringify(state)
                    );

                } catch (err) {

                    console.error(
                        "❌ Failed to persist latest AI state:",
                        err?.message || err
                    );

                }

            }

            // =================================================
            // VERIFY ROOM
            // =================================================

            const roomSockets =
                io.sockets.adapter.rooms.get(
                    room
                );

            const socketCount =
                roomSockets?.size ?? 0;

            console.log(
                "📡 [AI Socket Bridge] RECEIVED AI STATE",
                {
                    walletAddress,

                    room,

                    socketCount,

                    sockets:
                        roomSockets
                            ? [
                                ...roomSockets,
                            ]
                            : [],

                    eventNames:
                        events
                            ? Object.keys(events)
                            : [],

                    timestamp,
                }
            );

            // =================================================
            // FORWARD INDIVIDUAL EVENTS
            // =================================================
            //
            // Do NOT forward ai_state here because we send
            // the complete state separately below.
            //
            // This prevents duplicate ai_state events.
            // =================================================

            if (
                events &&
                typeof events ===
                    "object"
            ) {

                for (
                    const [
                        event,
                        payload,
                    ]
                    of Object.entries(
                        events
                    )
                ) {

                    if (
                        event ===
                        "ai_state"
                    ) {

                        continue;
                    }

                    io.to(room).emit(
                        event,
                        payload
                    );

                }

            }

            // =================================================
            // FORWARD COMPLETE STATE
            // =================================================

            if (state) {

                io.to(room).emit(
                    "ai_state",
                    state
                );

            }

            console.log(
                "📡 [AI Socket Bridge] AI STATE FORWARDED",
                {
                    walletAddress,

                    room,

                    socketCount,

                    recommendation:
                        state
                            ?.analysis
                            ?.recommendation ??
                        null,

                    confidence:
                        state
                            ?.analysis
                            ?.confidence ??
                        0,
                }
            );

        }
    );

    return subscriber;
}

// =====================================================
// GET LATEST AI STATE
// =====================================================
//
// Used by the API server when a frontend wallet joins.
//
// Priority:
//
// 1. In-memory cache
// 2. Redis
//
// Returns null if no state exists yet.
// =====================================================

export async function getLatestAIState(
    walletAddress
) {

    if (
        !walletAddress
    ) {

        return null;
    }

    // =================================================
    // MEMORY FIRST
    // =================================================

    const cached =
        latestAIStates.get(
            walletAddress
        );

    if (cached) {

        return cached;
    }

    // =================================================
    // REDIS FALLBACK
    // =================================================

    if (!stateRedis) {

        console.warn(
            "⚠️ AI Socket Bridge state Redis is not initialized."
        );

        return null;
    }

    try {

        const stored =
            await stateRedis.get(
                latestStateKey(
                    walletAddress
                )
            );

        if (!stored) {

            return null;
        }

        const parsed =
            JSON.parse(stored);

        latestAIStates.set(
            walletAddress,
            parsed
        );

        return parsed;

    } catch (err) {

        console.error(
            "❌ Failed to load latest AI state:",
            err?.message || err
        );

        return null;
    }
}

// =====================================================
// CLEAR LATEST AI STATE
// =====================================================
//
// Optional helper for when a position is completely
// removed and we no longer want the state cached.
// =====================================================

export async function clearLatestAIState(
    walletAddress
) {

    if (
        !walletAddress
    ) {

        return false;
    }

    latestAIStates.delete(
        walletAddress
    );

    if (!stateRedis) {
        return false;
    }

    try {

        await stateRedis.del(
            latestStateKey(
                walletAddress
            )
        );

        return true;

    } catch (err) {

        console.error(
            "❌ Failed to clear latest AI state:",
            err?.message || err
        );

        return false;
    }
}

export default {
    startAIStateSocketBridge,
    getLatestAIState,
    clearLatestAIState,
};