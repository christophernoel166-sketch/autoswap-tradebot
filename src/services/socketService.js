let io = null;

// =====================================================
// REGISTER SOCKET.IO INSTANCE
// =====================================================

export function setIO(socketInstance) {
  io = socketInstance;

  console.log("✅ Socket.IO service initialized.");
}

// =====================================================
// GET SOCKET.IO INSTANCE
// =====================================================

export function getIO() {
  return io;
}

// =====================================================
// CHECK IF SOCKET IS AVAILABLE
// =====================================================

export function hasIO() {
  return io !== null;
}

// =====================================================
// SAFE EMIT
// =====================================================

export function emit(event, payload) {
  if (!io) {
    return false;
  }

  io.emit(event, payload);

  return true;
}