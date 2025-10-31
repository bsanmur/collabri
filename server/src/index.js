// Collabrí - entrypoint principal
const app = require('./app');
const { startSocketIOServer } = require('./socketio');
const { ensureDatabase } = require('./initDb');
const http = require('http');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

(async () => {
  try {
    await ensureDatabase();
    server.listen(PORT, () => {
      console.log(`Servidor Collabrí escuchando en puerto ${PORT}`);
    });
    startSocketIOServer(server);
  } catch (e) {
    console.error('Error inicializando la base de datos:', e);
    process.exit(1);
  }
})();
