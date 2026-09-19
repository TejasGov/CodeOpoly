import express from 'express';
import { Game } from '../models/Game.js';
import { Problem } from '../models/Problem.js';
import { generateRoomCode } from '../utils/roomCode.js';
import { initializeBoard } from '../utils/boardInitializer.js';
import { saveGame, findGameById, findGameByRoomCode, updateGame, deleteGame, getAllGames } from '../utils/memoryStore.js';
import mongoose from 'mongoose';

const router = express.Router();

// Check if MongoDB is connected (function to check dynamically)
function useMongoDB() {
  return mongoose.connection.readyState === 1;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
}

// Health check endpoint for Railway / Render / Vercel uptime checks
router.get('/health', (_req, res) => {
  const mongoStatus = useMongoDB() ? 'connected' : 'disconnected (using in-memory fallback)';
  const activeLobbies = useMongoDB() ? undefined : getAllGames().length;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoStatus,
    activeLobbies,
  });
});

// Create a new game room
router.post('/games/create', async (req, res) => {
  try {
    const { playerName, avatar } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const roomCode = generateRoomCode(6);
    const boardState = initializeBoard();
    const playerId = `player-${Date.now()}`;

    const gameData = {
      roomCode,
      status: 'waiting' as const,
      players: [{
        id: playerId,
        name: playerName,
        avatar: avatar || '💻',
        position: 0,
        money: 1500,
        properties: [],
        inJail: false,
        jailTurns: 0,
      }],
      currentTurn: playerId,
      turnNumber: 1,
      startTime: new Date(),
      lastActivity: new Date(),
      boardState,
    };

    if (useMongoDB()) {
      const game = new Game(gameData);
      await game.save();
      return res.json({
        gameId: String(game._id),
        roomCode: game.roomCode,
        playerId: game.players[0].id,
      });
    } else {
      console.log('⚠️  MongoDB not connected, using in-memory store');
      const game = saveGame(gameData);
      return res.json({
        gameId: game._id,
        roomCode: game.roomCode,
        playerId: game.players[0].id,
      });
    }
  } catch (error: any) {
    console.error('Error creating game:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
    });
  }
});

// Join an existing game
router.post('/games/join', async (req, res) => {
  try {
    const { roomCode, playerName, avatar } = req.body;

    if (!roomCode || !playerName) {
      return res.status(400).json({ error: 'Room code and player name are required' });
    }

    const upperRoomCode = roomCode.toUpperCase().trim();
    let game: any;

    if (useMongoDB()) {
      game = await Game.findOne({ roomCode: upperRoomCode });
    } else {
      game = findGameByRoomCode(upperRoomCode);
    }

    if (!game) {
      return res.status(404).json({ error: 'Game not found. Make sure the 6-letter room code is correct.' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game is already in progress' });
    }

    if (game.players.length >= 4) {
      return res.status(400).json({ error: 'Game is full (maximum 4 players)' });
    }

    // Check if player name already in room
    const existingPlayer = game.players.find((p: any) => p.name.toLowerCase() === playerName.trim().toLowerCase());
    if (existingPlayer) {
      const id = game._id ? String(game._id) : game.id;
      return res.json({
        gameId: id,
        roomCode: game.roomCode,
        playerId: existingPlayer.id,
      });
    }

    const newPlayer = {
      id: `player-${Date.now()}`,
      name: playerName.trim(),
      avatar: avatar || '💻',
      position: 0,
      money: 1500,
      properties: [],
      inJail: false,
      jailTurns: 0,
    };

    game.players.push(newPlayer);
    game.lastActivity = new Date();
    
    if (useMongoDB()) {
      await game.save();
    } else {
      updateGame(game._id, game);
    }

    const gameId = game._id ? String(game._id) : game.id;
    res.json({
      gameId,
      roomCode: game.roomCode,
      playerId: newPlayer.id,
    });
  } catch (error: any) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get game state
router.get('/games/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    let game;
    if (useMongoDB() && isValidObjectId(gameId)) {
      game = await Game.findById(gameId);
    } else {
      game = findGameById(gameId);
    }

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error: any) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a game / lobby (e.g., when host cancels or game ends)
router.delete('/games/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    let deleted = false;

    if (useMongoDB() && isValidObjectId(gameId)) {
      const result = await Game.findByIdAndDelete(gameId);
      deleted = !!result;
    } else {
      deleted = deleteGame(gameId);
    }

    res.json({ success: true, deleted, gameId });
  } catch (error: any) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get problems by category and difficulty
router.get('/problems', async (req, res) => {
  try {
    const { category, difficulty } = req.query;

    const query: any = {};
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    if (useMongoDB()) {
      const problems = await Problem.find(query).limit(20);
      return res.json(problems);
    }
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


