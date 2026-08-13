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

// =====================================================
// SAFE ROOM EMIT
// =====================================================

export function emitToRoom(room, event, payload) {
  if (!io) {
    console.warn(
      "⚠️ [SocketService] emitToRoom() called but Socket.IO is not initialized.",
      {
        room,
        event,
      }
    );

    return false;
  }

  const roomSockets =
    io.sockets.adapter.rooms.get(room);

  const socketCount =
    roomSockets?.size ?? 0;

  console.log(
    "📡 [SocketService] EMIT TO ROOM",
    {
      room,
      event,
      socketCount,
      sockets:
        roomSockets
          ? [...roomSockets]
          : [],
    }
  );

  io.to(room).emit(
    event,
    payload
  );

  return true;
}