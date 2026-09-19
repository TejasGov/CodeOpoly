import express from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const router = express.Router();

function useMongoDB() {
  return mongoose.connection.readyState === 1;
}

// In-memory fallback so login still works if MongoDB is unreachable.
const memoryUsers = new Map<string, any>();

function publicUser(u: any) {
  return {
    username: u.username,
    avatar: u.avatar,
    gamesPlayed: u.gamesPlayed || 0,
    roundsPlayed: u.roundsPlayed || 0,
    wins: u.wins || 0,
    losses: u.losses || 0,
    totalEarnings: u.totalEarnings || 0,
    problemsSolved: u.problemsSolved || 0,
  };
}

// Username-only login: find or create a profile keyed by username.
router.post('/auth/login', async (req, res) => {
  try {
    const rawName = (req.body?.username || '').trim();
    const providedAvatar: string | undefined = req.body?.avatar;
    const avatar = providedAvatar || '💻';

    if (!rawName) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (rawName.length > 20) {
      return res.status(400).json({ error: 'Username must be 20 characters or fewer' });
    }

    if (useMongoDB()) {
      let user = await User.findOne({ username: rawName });
      if (!user) {
        user = await User.create({ username: rawName, avatar });
      } else {
        user.lastSeen = new Date();
        if (providedAvatar) user.avatar = providedAvatar;
        await user.save();
      }
      return res.json({ user: publicUser(user) });
    }

    // Fallback path
    let user = memoryUsers.get(rawName.toLowerCase());
    if (!user) {
      user = {
        username: rawName,
        avatar,
        gamesPlayed: 0,
        roundsPlayed: 0,
        wins: 0,
        losses: 0,
        totalEarnings: 0,
        problemsSolved: 0,
      };
      memoryUsers.set(rawName.toLowerCase(), user);
    } else if (providedAvatar) {
      user.avatar = providedAvatar;
    }
    return res.json({ user: publicUser(user) });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Fetch a player's profile / stats.
router.get('/users/:username', async (req, res) => {
  try {
    const name = req.params.username;
    if (useMongoDB()) {
      const user = await User.findOne({ username: name });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: publicUser(user) });
    }
    const user = memoryUsers.get(name.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Leaderboard: top players by wins.
router.get('/leaderboard', async (_req, res) => {
  try {
    if (useMongoDB()) {
      const users = await User.find().sort({ wins: -1, totalEarnings: -1 }).limit(10);
      return res.json({ leaderboard: users.map(publicUser) });
    }
    const users = Array.from(memoryUsers.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10);
    return res.json({ leaderboard: users.map(publicUser) });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time stat updater: Record a problem solved by a user
export async function recordProblemSolved(username: string) {
  try {
    if (!username) return;
    if (useMongoDB()) {
      await User.updateOne(
        { username },
        {
          $inc: { problemsSolved: 1 },
          $set: { lastSeen: new Date() },
        },
        { upsert: true }
      );
    } else {
      const key = username.toLowerCase();
      const existing = memoryUsers.get(key) || {
        username,
        avatar: '💻',
        gamesPlayed: 0,
        roundsPlayed: 0,
        wins: 0,
        losses: 0,
        totalEarnings: 0,
        problemsSolved: 0,
      };
      existing.problemsSolved = (existing.problemsSolved || 0) + 1;
      memoryUsers.set(key, existing);
    }
  } catch (error) {
    console.error('Error recording problem solved:', error);
  }
}

// Real-time stat updater: Record a completed round / turn for a user
export async function recordTurnCompleted(username: string) {
  try {
    if (!username) return;
    if (useMongoDB()) {
      await User.updateOne(
        { username },
        {
          $inc: { roundsPlayed: 1 },
          $set: { lastSeen: new Date() },
        },
        { upsert: true }
      );
    } else {
      const key = username.toLowerCase();
      const existing = memoryUsers.get(key) || {
        username,
        avatar: '💻',
        gamesPlayed: 0,
        roundsPlayed: 0,
        wins: 0,
        losses: 0,
        totalEarnings: 0,
        problemsSolved: 0,
      };
      existing.roundsPlayed = (existing.roundsPlayed || 0) + 1;
      memoryUsers.set(key, existing);
    }
  } catch (error) {
    console.error('Error recording turn completed:', error);
  }
}

// Record a finished game's results (called server-side; also exposed for safety).
export async function recordGameResult(players: any[], winnerName: string) {
  try {
    if (!players?.length) return;
    for (const p of players) {
      const isWinner = p.name === winnerName;
      if (useMongoDB()) {
        await User.updateOne(
          { username: p.name },
          {
            $inc: {
              gamesPlayed: 1,
              wins: isWinner ? 1 : 0,
              losses: isWinner ? 0 : 1,
              totalEarnings: Math.max(0, p.money || 0),
            },
            $set: { lastSeen: new Date() },
          },
          { upsert: true }
        );
      } else {
        const key = (p.name || '').toLowerCase();
        const existing = memoryUsers.get(key) || {
          username: p.name,
          avatar: p.avatar || '💻',
          gamesPlayed: 0,
          roundsPlayed: 0,
          wins: 0,
          losses: 0,
          totalEarnings: 0,
          problemsSolved: 0,
        };
        existing.gamesPlayed = (existing.gamesPlayed || 0) + 1;
        existing.wins = (existing.wins || 0) + (isWinner ? 1 : 0);
        existing.losses = (existing.losses || 0) + (isWinner ? 0 : 1);
        existing.totalEarnings = (existing.totalEarnings || 0) + Math.max(0, p.money || 0);
        memoryUsers.set(key, existing);
      }
    }
  } catch (error) {
    console.error('Error recording game result:', error);
  }
}

export default router;

