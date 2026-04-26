require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/db');
const authService = require('./services/auth.service');

const PORT = process.env.PORT || 3000;

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// attach io globally (simple approach)
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_competition', (competitionId) => {
    socket.join(`competition_${competitionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

module.exports = { server };

async function startServer() {
  try {
    // Test DB connection before starting server
    await testConnection();

    // Ensure a deployment bootstrap user exists
    await authService.ensureSuperAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
