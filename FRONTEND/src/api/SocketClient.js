import { io } from 'socket.io-client';

// ✅ Prend automatiquement l'IP depuis laquelle la page est chargée
// - Sur desktop : localhost:3000
// - Sur mobile via réseau : 192.168.x.x:3000
const SOCKET_URL = `http://${window.location.hostname}:3000`;

let socket = null;

export function getSocket() { return socket; }

export function initSocket(userId, token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth:       { token, userId },
    transports: ['websocket'],
    reconnection:        true,
    reconnectionDelay:   1000,
    reconnectionAttempts: 20,
  });

  socket.on('connect', () => {
    console.log('[socket] connecté :', socket.id);
    socket.emit('rejoindre:user', userId);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] déconnecté :', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] erreur :', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}