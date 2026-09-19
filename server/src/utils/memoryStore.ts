// Temporary in-memory store for games (no MongoDB required)
export interface GameData {
  _id: string;
  roomCode: string;
  status: string;
  players: any[];
  currentTurn: string;
  turnNumber: number;
  startTime: Date;
  lastActivity?: Date;
  boardState: any[];
  activeDuel?: any;
}

const games = new Map<string, GameData>();

export function saveGame(game: any): GameData {
  const gameData: GameData = {
    _id: game._id ? String(game._id) : `game-${Date.now()}`,
    roomCode: game.roomCode,
    status: game.status,
    players: game.players,
    currentTurn: game.currentTurn,
    turnNumber: game.turnNumber,
    startTime: game.startTime,
    lastActivity: new Date(),
    boardState: game.boardState,
    activeDuel: game.activeDuel,
  };
  games.set(gameData._id, gameData);
  return gameData;
}

export function findGameById(id: string): GameData | null {
  return games.get(id) || null;
}

export function findGameByRoomCode(roomCode: string): GameData | null {
  const upperCode = roomCode.toUpperCase().trim();
  for (const game of games.values()) {
    if (game.roomCode && game.roomCode.toUpperCase() === upperCode) {
      return game;
    }
  }
  return null;
}

export function updateGame(id: string, updates: Partial<GameData>): GameData | null {
  const game = games.get(id);
  if (!game) return null;
  
  const updated: GameData = { ...game, ...updates, lastActivity: new Date() };
  games.set(id, updated);
  return updated;
}

export function deleteGame(id: string): boolean {
  return games.delete(id);
}

export function deleteGameByRoomCode(roomCode: string): boolean {
  const upperCode = roomCode.toUpperCase().trim();
  for (const [id, game] of games.entries()) {
    if (game.roomCode && game.roomCode.toUpperCase() === upperCode) {
      return games.delete(id);
    }
  }
  return false;
}

export function cleanInactiveGames(waitingTtlMs = 30 * 60 * 1000, finishedTtlMs = 10 * 60 * 1000, activeTtlMs = 120 * 60 * 1000): number {
  const now = Date.now();
  let deletedCount = 0;
  for (const [id, game] of games.entries()) {
    const lastActive = game.lastActivity ? new Date(game.lastActivity).getTime() : new Date(game.startTime).getTime();
    const age = now - lastActive;

    if (game.status === 'waiting' && age > waitingTtlMs) {
      games.delete(id);
      deletedCount++;
    } else if (game.status === 'finished' && age > finishedTtlMs) {
      games.delete(id);
      deletedCount++;
    } else if (game.status === 'in-progress' && age > activeTtlMs) {
      games.delete(id);
      deletedCount++;
    }
  }
  return deletedCount;
}

export function getAllGames(): GameData[] {
  return Array.from(games.values());
}


