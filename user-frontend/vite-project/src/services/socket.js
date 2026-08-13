import { io } from "socket.io-client";

let socket = null;

// =====================================================
// CONNECT
// =====================================================

export function connectSocket(walletAddress) {
    if (!walletAddress) {
        console.warn(
            "⚠️ [Socket] Cannot connect without wallet address"
        );

        return null;
    }

    const backend =
        import.meta.env.VITE_API_URL ||
        "https://autoswap-tradebot-production.up.railway.app";

    // =================================================
    // EXISTING SOCKET
    // =================================================

    if (socket) {

        console.log(
            "🔌 [Socket] Existing socket detected",
            {
                socketId: socket.id,
                connected: socket.connected,
                walletAddress,
            }
        );

        if (!socket.connected) {
            socket.connect();
        }

        // Always join wallet room
        socket.emit(
            "join-wallet",
            walletAddress
        );

        console.log(
            "📡 [Socket] join-wallet emitted",
            {
                walletAddress,
                socketId: socket.id,
            }
        );

        return socket;
    }

    // =================================================
    // CREATE SOCKET
    // =================================================

    console.log(
        "🔌 [Socket] Creating Socket.IO connection",
        {
            backend,
            walletAddress,
        }
    );

    socket = io(backend, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 20000,
    });

    // =================================================
    // CONNECT
    // =================================================

    socket.on("connect", () => {

        console.log(
            "✅ [Socket] CONNECTED",
            {
                socketId: socket.id,
                walletAddress,
                connected: socket.connected,
            }
        );

        socket.emit(
            "join-wallet",
            walletAddress
        );

        console.log(
            "📡 [Socket] join-wallet emitted AFTER CONNECT",
            {
                socketId: socket.id,
                walletAddress,
            }
        );
    });

    // =================================================
    // AI STATE
    // =================================================

    socket.on(
        "ai_state",
        (payload) => {

            console.log(
                "🧠 [Socket] FRONTEND RECEIVED ai_state",
                payload
            );
        }
    );

    // =================================================
    // AI ACTIVITY
    // =================================================

    socket.on(
        "ai_activity",
        (payload) => {

            console.log(
                "🧠 [Socket] FRONTEND RECEIVED ai_activity",
                payload
            );
        }
    );

    // =================================================
    // DISCONNECT
    // =================================================

    socket.on(
        "disconnect",
        (reason) => {

            console.warn(
                "❌ [Socket] DISCONNECTED",
                {
                    socketId: socket?.id,
                    walletAddress,
                    reason,
                }
            );
        }
    );

    // =================================================
    // CONNECT ERROR
    // =================================================

    socket.on(
        "connect_error",
        (error) => {

            console.error(
                "❌ [Socket] CONNECT ERROR",
                {
                    message: error?.message,
                    description:
                        error?.description,
                    context:
                        error?.context,
                }
            );
        }
    );

    // =================================================
    // RECONNECT ATTEMPT
    // =================================================

    socket.io.on(
        "reconnect_attempt",
        (attempt) => {

            console.log(
                "🔄 [Socket] RECONNECT ATTEMPT",
                {
                    attempt,
                    walletAddress,
                }
            );
        }
    );

    // =================================================
    // RECONNECT
    // =================================================

    socket.io.on(
        "reconnect",
        (attempt) => {

            console.log(
                "✅ [Socket] RECONNECTED",
                {
                    attempt,
                    socketId: socket.id,
                    walletAddress,
                }
            );

            socket.emit(
                "join-wallet",
                walletAddress
            );
        }
    );

    // =================================================
    // RECONNECT ERROR
    // =================================================

    socket.io.on(
        "reconnect_error",
        (error) => {

            console.error(
                "❌ [Socket] RECONNECT ERROR",
                error
            );
        }
    );

    return socket;
}

// =====================================================
// GET SOCKET
// =====================================================

export function getSocket() {
    return socket;
}

// =====================================================
// DISCONNECT
// =====================================================

export function disconnectSocket() {

    if (!socket) {
        return;
    }

    console.log(
        "🔌 [Socket] Manual disconnect",
        {
            socketId: socket.id,
        }
    );

    socket.disconnect();

    socket = null;
}