import { io } from "socket.io-client";

let socket = null;
let currentWalletAddress = null;

// =====================================================
// DIAGNOSTIC COUNTERS
// =====================================================

let diagnosticConnectCalls = 0;
let diagnosticIOCreations = 0;
let diagnosticDisconnectCalls = 0;
let diagnosticStartCalls = 0;
let diagnosticJoinCalls = 0;

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

    diagnosticJoinCalls++;

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] joinWalletRoom() CALLED",
        {
            callNumber:
                diagnosticJoinCalls,

            socketExists:
                !!socket,

            socketId:
                socket?.id,

            socketConnected:
                socket?.connected,

            currentWalletAddress,

            timestamp:
                Date.now(),
        }
    );

    if (!socket || !socket.connected) {

        console.warn(
            "🚨 [SOCKET DIAGNOSTIC] joinWalletRoom() ABORTED",
            {
                reason:
                    !socket
                        ? "NO_SOCKET"
                        : "SOCKET_NOT_CONNECTED",

                socketExists:
                    !!socket,

                socketId:
                    socket?.id,

                socketConnected:
                    socket?.connected,

                currentWalletAddress,

                timestamp:
                    Date.now(),
            }
        );

        return;
    }

    if (!currentWalletAddress) {

        console.warn(
            "⚠️ [Socket] Cannot join wallet room: no wallet address."
        );

        return;
    }

    // =================================================
    // EMIT JOIN-WALLET
    // =================================================

    socket.emit(
        "join-wallet",
        currentWalletAddress
    );

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] join-wallet EMITTED",
        {
            socketId:
                socket.id,

            walletAddress:
                currentWalletAddress,

            connected:
                socket.connected,

            timestamp:
                Date.now(),
        }
    );

    console.log(
        "📡 [Socket] join-wallet SENT",
        {
            socketId:
                socket.id,

            walletAddress:
                currentWalletAddress,

            room:
                `wallet:${currentWalletAddress}`,
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

    diagnosticConnectCalls++;

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] connectSocket() CALLED",
        {
            callNumber:
                diagnosticConnectCalls,

            walletAddress,

            options,

            existingSocket:
                !!socket,

            socketId:
                socket?.id,

            socketConnected:
                socket?.connected,

            currentWalletAddress,

            timestamp:
                Date.now(),

            stack:
                new Error().stack,
        }
    );

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

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] CURRENT WALLET UPDATED",
        {
            currentWalletAddress,
            timestamp:
                Date.now(),
        }
    );

    // =================================================
    // EXISTING SOCKET
    // =================================================

    if (socket) {

        console.log(
            "🧠 [Socket] Existing socket detected",
            {
                socketId:
                    socket.id,

                connected:
                    socket.connected,

                walletAddress,
            }
        );

        console.log(
            "🚨 [SOCKET DIAGNOSTIC] EXISTING SOCKET PATH",
            {
                socketId:
                    socket.id,

                connected:
                    socket.connected,

                walletAddress,

                connectNow,

                timestamp:
                    Date.now(),
            }
        );

        if (
            connectNow &&
            !socket.connected
        ) {

            console.log(
                "🚨 [SOCKET DIAGNOSTIC] CALLING socket.connect() FROM EXISTING SOCKET PATH",
                {
                    socketId:
                        socket.id,

                    walletAddress,

                    timestamp:
                        Date.now(),

                    stack:
                        new Error().stack,
                }
            );

            socket.connect();
        }

        if (
            connectNow &&
            socket.connected
        ) {

            console.log(
                "🚨 [SOCKET DIAGNOSTIC] EXISTING SOCKET ALREADY CONNECTED — JOINING ROOM",
                {
                    socketId:
                        socket.id,

                    walletAddress,

                    timestamp:
                        Date.now(),
                }
            );

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
    // ACTUAL SOCKET.IO CLIENT CREATION
    // =================================================

    diagnosticIOCreations++;

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] ACTUAL io() CREATION",
        {
            creationNumber:
                diagnosticIOCreations,

            backend,

            walletAddress,

            connectNow,

            timestamp:
                Date.now(),

            stack:
                new Error().stack,
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

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] SOCKET.IO CLIENT CREATED",
        {
            socketId:
                socket.id,

            connected:
                socket.connected,

            walletAddress:
                currentWalletAddress,

            backend,

            timestamp:
                Date.now(),
        }
    );

    // =================================================
    // CONNECT
    // =================================================

    socket.on(
        "connect",
        () => {

            console.log(
                "🚨 [SOCKET DIAGNOSTIC] CLIENT CONNECT EVENT",
                {
                    socketId:
                        socket.id,

                    walletAddress:
                        currentWalletAddress,

                    connected:
                        socket.connected,

                    transport:
                        socket.io.engine
                            ?.transport
                            ?.name,

                    timestamp:
                        Date.now(),
                }
            );

            console.log(
                "✅ [Socket] CONNECTED",
                {
                    socketId:
                        socket.id,

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
                "🚨 [SOCKET DIAGNOSTIC] CLIENT CONNECT ERROR",
                {
                    socketId:
                        socket?.id,

                    walletAddress:
                        currentWalletAddress,

                    message:
                        error?.message,

                    description:
                        error?.description,

                    context:
                        error?.context,

                    type:
                        error?.type,

                    timestamp:
                        Date.now(),
                }
            );

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
                "🚨 [SOCKET DIAGNOSTIC] SOCKET DISCONNECT EVENT",
                {
                    socketId:
                        socket?.id,

                    reason,

                    connected:
                        socket?.connected,

                    walletAddress:
                        currentWalletAddress,

                    timestamp:
                        Date.now(),
                }
            );

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
                "🚨 [SOCKET DIAGNOSTIC] RECONNECT ATTEMPT",
                {
                    attempt,

                    socketId:
                        socket?.id,

                    walletAddress:
                        currentWalletAddress,

                    timestamp:
                        Date.now(),
                }
            );

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
                "🚨 [SOCKET DIAGNOSTIC] RECONNECT EVENT",
                {
                    attempt,

                    socketId:
                        socket?.id,

                    walletAddress:
                        currentWalletAddress,

                    connected:
                        socket?.connected,

                    timestamp:
                        Date.now(),
                }
            );

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
                "🚨 [SOCKET DIAGNOSTIC] RECONNECT ERROR",
                {
                    socketId:
                        socket?.id,

                    walletAddress:
                        currentWalletAddress,

                    message:
                        error?.message,

                    timestamp:
                        Date.now(),
                }
            );

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
                "🚨 [SOCKET DIAGNOSTIC] RECONNECT FAILED",
                {
                    socketId:
                        socket?.id,

                    walletAddress:
                        currentWalletAddress,

                    timestamp:
                        Date.now(),
                }
            );

            console.error(
                "❌ [Socket] RECONNECT FAILED"
            );
        }
    );

    // =================================================
    // CONNECT ONLY AFTER LISTENERS HAVE BEEN ATTACHED
    // =================================================

    if (connectNow) {

        console.log(
            "🚨 [SOCKET DIAGNOSTIC] CALLING socket.connect() FROM NEW SOCKET PATH",
            {
                socketId:
                    socket.id,

                walletAddress:
                    currentWalletAddress,

                timestamp:
                    Date.now(),

                stack:
                    new Error().stack,
            }
        );

        socket.connect();

    } else {

        console.log(
            "🚨 [SOCKET DIAGNOSTIC] NOT CONNECTING YET",
            {
                reason:
                    "connectNow=false",

                socketId:
                    socket.id,

                walletAddress:
                    currentWalletAddress,

                timestamp:
                    Date.now(),
            }
        );
    }

    return socket;
}

// =====================================================
// START SOCKET CONNECTION
//
// Used after AI listeners have been attached.
// =====================================================

export function startSocket() {

    diagnosticStartCalls++;

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] startSocket() CALLED",
        {
            callNumber:
                diagnosticStartCalls,

            socketExists:
                !!socket,

            socketId:
                socket?.id,

            connected:
                socket?.connected,

            walletAddress:
                currentWalletAddress,

            timestamp:
                Date.now(),

            stack:
                new Error().stack,
        }
    );

    if (!socket) {

        console.warn(
            "⚠️ [Socket] startSocket() called before socket exists."
        );

        return false;
    }

    if (socket.connected) {

        console.log(
            "🚨 [SOCKET DIAGNOSTIC] startSocket() FOUND CONNECTED SOCKET",
            {
                socketId:
                    socket.id,

                walletAddress:
                    currentWalletAddress,

                timestamp:
                    Date.now(),
            }
        );

        joinWalletRoom();

        return true;
    }

    console.log(
        "🚀 [Socket] Starting Socket.IO connection..."
    );

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] CALLING socket.connect() FROM startSocket()",
        {
            socketId:
                socket.id,

            walletAddress:
                currentWalletAddress,

            connected:
                socket.connected,

            timestamp:
                Date.now(),

            stack:
                new Error().stack,
        }
    );

    socket.connect();

    return true;
}

// =====================================================
// GET SOCKET
// =====================================================

export function getSocket() {

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] getSocket() CALLED",
        {
            socketExists:
                !!socket,

            socketId:
                socket?.id,

            connected:
                socket?.connected,

            walletAddress:
                currentWalletAddress,

            timestamp:
                Date.now(),
        }
    );

    return socket;
}

// =====================================================
// GET CURRENT WALLET
// =====================================================

export function getCurrentWalletAddress() {

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] getCurrentWalletAddress() CALLED",
        {
            currentWalletAddress,
            timestamp:
                Date.now(),
        }
    );

    return currentWalletAddress;
}

// =====================================================
// DISCONNECT
// =====================================================

export function disconnectSocket() {

    diagnosticDisconnectCalls++;

    console.warn(
        "🚨 [SOCKET DIAGNOSTIC] disconnectSocket() CALLED",
        {
            callNumber:
                diagnosticDisconnectCalls,

            socketExists:
                !!socket,

            socketId:
                socket?.id,

            connected:
                socket?.connected,

            walletAddress:
                currentWalletAddress,

            timestamp:
                Date.now(),

            stack:
                new Error().stack,
        }
    );

    if (!socket) {

        console.log(
            "🚨 [SOCKET DIAGNOSTIC] disconnectSocket() ABORTED — NO SOCKET",
            {
                timestamp:
                    Date.now(),
            }
        );

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

    console.warn(
        "🚨 [SOCKET DIAGNOSTIC] CALLING socket.disconnect()",
        {
            socketId:
                socket.id,

            connected:
                socket.connected,

            walletAddress:
                currentWalletAddress,

            timestamp:
                Date.now(),

            stack:
                new Error().stack,
        }
    );

    socket.disconnect();

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] socket.disconnect() COMPLETED",
        {
            socketId:
                socket.id,

            connected:
                socket.connected,

            walletAddress:
                currentWalletAddress,

            timestamp:
                Date.now(),
        }
    );

    socket = null;

    currentWalletAddress = null;

    console.log(
        "🚨 [SOCKET DIAGNOSTIC] SOCKET SINGLETON CLEARED",
        {
            socketIsNull:
                socket === null,

            currentWalletAddress,

            timestamp:
                Date.now(),
        }
    );
}