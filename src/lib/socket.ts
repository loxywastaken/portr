import { io, type Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL ?? '';

let socket: Socket | null = null;

/** Lazily creates the shared, credentialed Socket.IO connection. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL || '/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
