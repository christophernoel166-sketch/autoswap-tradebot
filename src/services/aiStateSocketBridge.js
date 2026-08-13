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
// START AI STATE SOCKET BRIDGE
// =====================================================
//
// Runs ONLY inside the API SERVICE.
//
// Flow:
//
// Redis Pub/Sub
//      ↓
// AI state message
//      ↓
// Socket.IO room
//      ↓
// Frontend
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

    // Dedicated Redis subscriber.
    //
    // IMPORTANT:
    // Do NOT use the normal redis client
    // for SUBSCRIBE operations.

    const subscriber =
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

    subscriber.on(
        "connect",
        () => {

            console.log(
                "✅ AI Socket Bridge Redis connected"
            );

        }
    );

    subscriber.on(
        "ready",
        () => {

            console.log(
                "✅ AI Socket Bridge Redis ready"
            );

        }
    );

    subscriber.on(
        "error",
        (err) => {

            console.error(
                "❌ AI Socket Bridge Redis error:",
                err?.message || err
            );

        }
    );

    subscriber.on(
        "close",
        () => {

            console.warn(
                "⚠️ AI Socket Bridge Redis closed"
            );

        }
    );

    subscriber.on(
        "reconnecting",
        () => {

            console.warn(
                "🔄 AI Socket Bridge Redis reconnecting..."
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
        (channel, message) => {

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

            // =============================================
            // Verify room
            // =============================================

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

            // =============================================
            // Forward individual AI events
            // =============================================

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

                    io.to(room).emit(
                        event,
                        payload
                    );

                }

            }

            // =============================================
            // ALWAYS forward complete state
            // =============================================

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

export default {
    startAIStateSocketBridge,
};