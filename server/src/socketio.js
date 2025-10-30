const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

let ioInstance;
const userSockets = new Map(); // userId -> Set(socket)

function startSocketIOServer(httpServer) {
  const io = new Server(httpServer, { 
    path: '/ws', 
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Falta token'));
    try {
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      return next();
    } catch {
      return next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket);
    socket.emit('welcome', { userId });
    socket.on('disconnect', () => {
      userSockets.get(userId)?.delete(socket);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
    });
  });
}

function sendToUser(userId, payload) {
  const sockets = userSockets.get(userId);
  if (sockets && sockets.size > 0) {
    sockets.forEach(sock => sock.emit(payload.type, payload.data));
    return true;
  }
  return false;
}

module.exports = { startSocketIOServer, sendToUser };
