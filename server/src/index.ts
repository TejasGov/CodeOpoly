import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import gameRoutes from './routes/gameRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { Game } from './models/Game.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';
import { cleanInactiveGames } from './utils/memoryStore.js';

dotenv.config();

const app = express();

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',
  'http://localhost:5174',
];

const envOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const corsOriginDelegate = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || origin.endsWith('.vercel.app') || origin.endsWith('.railway.app') || origin.endsWith('.onrender.com')) {
    return callback(null, true);
  }
  return callback(null, true); // Permissive for game lobbies across web devices
};

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginDelegate,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: corsOriginDelegate,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());

// Root health check for deploy orchestrators
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', gameRoutes);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codeopoly';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error (using in-memory fallback):', error.message);
  });

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  setupSocketHandlers(io, socket);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Automated Lobby Sweeper / Cleanup: runs every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(async () => {
  try {
    const memoryCleaned = cleanInactiveGames();
    if (memoryCleaned > 0) {
      console.log(`🧹 In-memory lobby sweeper cleaned ${memoryCleaned} inactive games`);
    }

    if (mongoose.connection.readyState === 1) {
      const now = new Date();
      const waitingCutoff = new Date(now.getTime() - 30 * 60 * 1000);
      const finishedCutoff = new Date(now.getTime() - 10 * 60 * 1000);
      const abandonedCutoff = new Date(now.getTime() - 120 * 60 * 1000);

      const res = await Game.deleteMany({
        $or: [
          { status: 'waiting', updatedAt: { $lt: waitingCutoff } },
          { status: 'finished', updatedAt: { $lt: finishedCutoff } },
          { status: 'in-progress', updatedAt: { $lt: abandonedCutoff } },
        ]
      });

      if (res.deletedCount && res.deletedCount > 0) {
        console.log(`🧹 MongoDB lobby sweeper cleaned ${res.deletedCount} inactive games`);
      }
    }
  } catch (err: any) {
    console.error('Error during scheduled lobby cleanup:', err.message);
  }
}, CLEANUP_INTERVAL_MS);

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});


