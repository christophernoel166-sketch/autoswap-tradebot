import { io } from "socket.io-client";

let socket = null;

// =====================================================
// CONNECT
// =====================================================

export function connectSocket(walletAddress) {

  if (!walletAddress) {
    return null;
  }

  if (socket) {

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "join-wallet",
      walletAddress
    );

    return socket;

  }

  const backend =
    import.meta.env.VITE_API_URL ||
    "https://api.autoswaps.online";

  socket = io(backend, {
    transports: ["websocket"],
    reconnection: true,
  });

  socket.on("connect", () => {

    console.log(
      "✅ Socket connected:",
      socket.id
    );

    socket.emit(
      "join-wallet",
      walletAddress
    );

  });

  socket.on("disconnect", () => {

    console.log(
      "❌ Socket disconnected"
    );

  });

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

  socket.disconnect();

  socket = null;

}