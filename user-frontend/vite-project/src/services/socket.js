import { io } from "socket.io-client";

let socket = null;
let currentWalletAddress = null;

// =====================================================
// BACKEND URL
// =====================================================

function getBackendUrl() {
    return (
        import.meta.env.VITE_API_URL ||
        "https://autoswap-tradebot-production.up.railway.app"
    );
}

// =====================================================
// JOIN CURRENT WALLET ROOM
// =====================================================

function joinWalletRoom() {
    if (!socket || !socket.connected) {
        return;
    }

    if (!currentWalletAddress) {
        console.warn(
            "⚠️ [Socket] Cannot join wallet room: no wallet address."
        );

        return;
    }

    socket.emit(
        "join-wallet",
        currentWalletAddress
    );

    console.log(
        "📡 [Socket] join-wallet SENT",
        {
            socketId: socket.id,
            walletAddress: currentWalletAddress,
            room: `wallet:${currentWalletAddress}`,
        }
    );
}

// =====================================================
// CONNECT / CREATE SOCKET
//
// connectNow = false is used by AIBootstrap so that
// AI listeners can be attached BEFORE the socket connects.
// =====================================================

export function connectSocket(
    walletAddress,
    options = {}
) {

    const {
        connectNow = true,
    } = options;

    if (!walletAddress) {

        console.warn(
            "⚠️ [Socket] connectSocket called without wallet"
        );

        return null;
    }

    currentWalletAddress =
        walletAddress;

    // =================================================
    // EXISTING SOCKET
    // =================================================

    if (socket) {

        console.log(
            "🧠 [Socket] Existing socket detected",
            {
                socketId: socket.id,
                connected: socket.connected,
                walletAddress,
            }
        );

        if (
            connectNow &&
            !socket.connected
        ) {
            socket.connect();
        }

        if (
            connectNow &&
            socket.connected
        ) {
            joinWalletRoom();
        }

        return socket;
    }

    // =================================================
    // BACKEND
    // =================================================

    const backend =
        getBackendUrl();

    console.log(
        "🧠 [Socket] Creating new Socket.IO connection",
        {
            backend,
            walletAddress,
            connectNow,
        }
    );

    // =================================================
    // CREATE SOCKET
    //
    // IMPORTANT:
    // autoConnect:false prevents Socket.IO from connecting
    // before AIBootstrap has attached AI listeners.
    // =================================================

    socket = io(
        backend,
        {
            transports: ["websocket"],

            autoConnect: false,

            reconnection: true,

            reconnectionAttempts: Infinity,

            reconnectionDelay: 1000,

            reconnectionDelayMax: 5000,

            timeout: 20000,
        }
    );

    // =================================================
    // CONNECT
    // =================================================

    socket.on(
        "connect",
        () => {

            console.log(
                "✅ [Socket] CONNECTED",
                {
                    socketId: socket.id,
                    walletAddress:
                        currentWalletAddress,
                    connected:
                        socket.connected,
                    transport:
                        socket.io.engine
                            ?.transport
                            ?.name,
                }
            );

            // Always join the wallet room after
            // a successful connection.
            joinWalletRoom();
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
                    message:
                        error?.message,

                    description:
                        error?.description,

                    context:
                        error?.context,

                    type:
                        error?.type,
                }
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
                    socketId:
                        socket?.id,

                    reason,

                    connected:
                        socket?.connected,
                }
            );
        }
    );

    // =================================================
    // SOCKET.IO MANAGER EVENTS
    //
    // These belong to socket.io, NOT socket.
    // =================================================

    socket.io.on(
        "reconnect_attempt",
        (attempt) => {

            console.log(
                "🔄 [Socket] RECONNECT ATTEMPT",
                {
                    attempt,
                }
            );
        }
    );

    socket.io.on(
        "reconnect",
        (attempt) => {

            console.log(
                "✅ [Socket] RECONNECTED",
                {
                    attempt,

                    socketId:
                        socket.id,

                    walletAddress:
                        currentWalletAddress,
                }
            );

            // The "connect" event will also fire after
            // reconnection and will join the wallet room.
        }
    );

    socket.io.on(
        "reconnect_error",
        (error) => {

            console.error(
                "❌ [Socket] RECONNECT ERROR",
                {
                    message:
                        error?.message,
                }
            );
        }
    );

    socket.io.on(
        "reconnect_failed",
        () => {

            console.error(
                "❌ [Socket] RECONNECT FAILED"
            );
        }
    );

    // =================================================
    // CONNECT ONLY AFTER LISTENERS HAVE BEEN ATTACHED
    // =================================================

    if (connectNow) {
        socket.connect();
    }

    return socket;
}

// =====================================================
// START SOCKET CONNECTION
//
// Used after AI listeners have been attached.
// =====================================================

export function startSocket() {

    if (!socket) {

        console.warn(
            "⚠️ [Socket] startSocket() called before socket exists."
        );

        return false;
    }

    if (socket.connected) {

        joinWalletRoom();

        return true;
    }

    console.log(
        "🚀 [Socket] Starting Socket.IO connection..."
    );

    socket.connect();

    return true;
}

// =====================================================
// GET SOCKET
// =====================================================

export function getSocket() {
    return socket;
}

// =====================================================
// GET CURRENT WALLET
// =====================================================

export function getCurrentWalletAddress() {
    return currentWalletAddress;
}

// =====================================================
// DISCONNECT
// =====================================================

export function disconnectSocket() {

    if (!socket) {
        return;
    }

    console.log(
        "🛑 [Socket] disconnectSocket() called",
        {
            socketId:
                socket.id,

            connected:
                socket.connected,

            walletAddress:
                currentWalletAddress,
        }
    );

    socket.disconnect();

    socket = null;

    currentWalletAddress = null;
}