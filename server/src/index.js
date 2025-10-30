// Collabrí - entrypoint principal
const app = require('./app');
const { startSocketIOServer } = require('./socketio');
const http = require('http');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Servidor Collabrí escuchando en puerto ${PORT}`);
});

// Iniciar Socket.IO sobre el mismo server
startSocketIOServer(server);
