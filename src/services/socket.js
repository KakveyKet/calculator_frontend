import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  autoConnect: false,
});

export function connectSocket(token) {
  if (!token) return;

  socket.auth = { token };

  if (socket.connected) {
    socket.disconnect();
  }

  socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
