import { io } from "socket.io-client";
const listeners = new Set();
let socket = null;

function getSocketOptions() {
  const token = localStorage.getItem("token");
  return {
    path: '/ws',
    auth: { token },
    withCredentials: true,
    transports: ['websocket']
  };
}

function getSocketUrl() {
  // Conectar explícitamente al backend (puerto 3000)
  return 'http://localhost:3000';
}

export function connect() {
  if (socket && socket.connected) return;
  socket = io(getSocketUrl(), getSocketOptions());
  socket.on('connect', () => {
    listeners.forEach((l) => l({ type: "ws:open" }));
  });
  socket.on('disconnect', () => {
    listeners.forEach((l) => l({ type: "ws:close" }));
  });

  // taskAssigned (evento principal de backend)
  socket.on('taskAssigned', (data) => {
    listeners.forEach((l) => {
      try { l({ type: "taskAssigned", data }); } catch {}
    });
  });
  // welcome opcional
  socket.on('welcome', (data) => {
    listeners.forEach((l) => {
      try { l({ type: "ws:welcome", data }); } catch {}
    });
  });
}

export function disconnect() {
  if (socket) socket.disconnect();
  socket = null;
}

export function subscribe(cb) {
  listeners.add(cb);
  if (listeners.size === 1) connect();
  return () => unsubscribe(cb);
}
export function unsubscribe(cb) {
  listeners.delete(cb);
  if (listeners.size === 0) disconnect();
}
