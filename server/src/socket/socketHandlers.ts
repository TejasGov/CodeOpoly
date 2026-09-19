import { Server, Socket } from 'socket.io';
import { Game } from '../models/Game.js';
import { Problem } from '../models/Problem.js';
import { executeCode } from '../services/judge0Service.js';
import { findGameById, updateGame } from '../utils/memoryStore.js';
import { getRandomChanceCard, getRandomCommunityChestCard, type DebuggingCard } from '../utils/debuggingCards.js';
import { recordGameResult } from '../routes/authRoutes.js';
import mongoose from 'mongoose';

function computeWinnerName(players: any[]): string {
  if (!players?.length) return '';
  const netWorth = (p: any) => (p.money || 0) + (p.properties?.length || 0) * 100;
  return players.reduce((best, p) => (netWorth(p) > netWorth(best) ? p : best)).name;
}

function useMongoDB() {
  return mongoose.connection.readyState === 1;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
}

async function getGameById(gameId: string) {
  if (useMongoDB() && isValidObjectId(gameId)) {
    return await Game.findById(gameId);
  } else {
    return findGameById(gameId);
  }
}

async function endPlayerTurn(game: any, gameId: string, io: Server) {
  if (!game || !game.players || game.players.length === 0) {
    console.error('❌ Cannot end turn: Invalid game or no players');
    return;
  }

  const currentIndex = game.players.findIndex((p: any) => p.id === game.currentTurn);
  
  if (currentIndex === -1) {
    console.error(`❌ Cannot end turn: Current player ${game.currentTurn} not found in players list`);
    return;
  }

  const nextIndex = (currentIndex + 1) % game.players.length;
  const previousPlayer = game.players[currentIndex].name;
  const nextPlayer = game.players[nextIndex].name;
  
  game.currentTurn = game.players[nextIndex].id;
  game.turnNumber += 1;

  console.log(`🔄 Turn switching: ${previousPlayer} → ${nextPlayer} (Turn #${game.turnNumber})`);

  try {
    if (useMongoDB()) {
      await game.save();
    } else {
      updateGame(gameId, game);
    }

    io.to(gameId).emit('turn-ended', {
      nextPlayerId: game.currentTurn,
      nextPlayerName: game.players[nextIndex].name,
      turnNumber: game.turnNumber,
    });

    // Broadcast updated game state to all players
    const gameState = {
      ...game.toObject ? game.toObject() : game,
      boardState: game.boardState || [],
      players: game.players || [],
    };
    io.to(gameId).emit('game-state', gameState);
    console.log(`✅ Turn ended successfully, next player: ${nextPlayer}`);
  } catch (error) {
    console.error('❌ Error in endPlayerTurn:', error);
    throw error;
  }
}

export function setupSocketHandlers(io: Server, socket: Socket) {
  // Join game room
  socket.on('join-game', async ({ gameId, playerId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Update player's socket ID
      const player = game.players.find((p: any) => p.id === playerId);
      if (player) {
        player.socketId = socket.id;
        if (useMongoDB()) {
          await game.save();
        } else {
          updateGame(gameId, game);
        }
      }

      socket.join(gameId);
      socket.emit('joined-game', { gameId, playerId });
      
      // Send current game state to the joining player
      const gameState = {
        ...game.toObject ? game.toObject() : game,
        boardState: game.boardState || [],
        players: game.players || [],
      };
      socket.emit('game-state', gameState);
      
      // Notify other players and broadcast updated game state to all
      socket.to(gameId).emit('player-joined', {
        playerId,
        playerName: player?.name,
        playerAvatar: player?.avatar,
      });
      
      // Broadcast updated game state to all players in the room
      io.to(gameId).emit('game-state', gameState);
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  // Roll dice
  socket.on('roll-dice', async ({ gameId, playerId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game || game.currentTurn !== playerId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2;

      const player = game.players.find((p: any) => p.id === playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      // Move player
      const newPosition = (player.position + total) % 40;
      const passedGo = player.position + total >= 40;
      
      player.position = newPosition;
      if (passedGo) {
        player.money += 200; // Pass Go, collect $200
      }

      if (useMongoDB()) {
        await game.save();
      } else {
        updateGame(gameId, game);
      }

      io.to(gameId).emit('dice-rolled', {
        playerId,
        dice: [dice1, dice2],
        total,
        newPosition,
        passedGo,
      });

      // Check what space player landed on
      const property = game.boardState.find(p => p.position === newPosition);
      if (property) {
        // Handle Debugging Card System (Chance/Community Chest)
        if (property.specialType === 'chance') {
          const card = getRandomChanceCard();
          applyCardEffect(game, player, card, io, gameId);
          socket.emit('debugging-card-drawn', {
            card,
            playerId,
            property: property.name,
          });
        } else if (property.specialType === 'community-chest') {
          const card = getRandomCommunityChestCard();
          applyCardEffect(game, player, card, io, gameId);
          socket.emit('debugging-card-drawn', {
            card,
            playerId,
            property: property.name,
          });
        } else {
          // Broadcast to all players so they can see what space was landed on
          io.to(gameId).emit('landed-on-space', {
            playerId,
            property,
            canBuy: !property.ownerId && property.price > 0,
            mustPayRent: property.ownerId && property.ownerId !== playerId,
          });
        }
      }
    } catch (error) {
      console.error('Error rolling dice:', error);
      socket.emit('error', { message: 'Failed to roll dice' });
    }
  });

  // Buy property
  socket.on('buy-property', async ({ gameId, playerId, propertyId, code, language }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const property = game.boardState.find((p: any) => p.id === propertyId);
      if (!property || property.ownerId || property.price === 0) {
        socket.emit('error', { message: 'Cannot buy this property' });
        return;
      }

      const player = game.players.find((p: any) => p.id === playerId);
      if (!player || player.money < property.price) {
        socket.emit('error', { message: 'Not enough money' });
        return;
      }

      // Get problem for this property - use in-memory problem bank
      // For now, accept the code if it was validated client-side
      // In production, you'd validate server-side too
      
      // Property purchase successful - Automated Solution Upgrade
      property.ownerId = playerId;
      property.houses = 1; // First solution automatically added
      player.money -= property.price;
      if (!player.properties) {
        player.properties = [];
      }
      player.properties.push(propertyId);

      if (useMongoDB()) {
        await game.save();
      } else {
        updateGame(gameId, game);
      }

      const playerName = player.name || 'Player';
      io.to(gameId).emit('property-bought', {
        playerId,
        playerName,
        propertyId,
        propertyName: property.name,
      });

      // Automatically end turn after buying property
      console.log(`💰 Property bought by ${playerName}, ending turn...`);
      try {
        await endPlayerTurn(game, gameId, io);
      } catch (turnError) {
        console.error('Error ending turn after property purchase:', turnError);
      }
    } catch (error) {
      console.error('Error buying property:', error);
      socket.emit('error', { message: 'Failed to buy property' });
    }
  });

  // Challenge to code duel
  socket.on('challenge-duel', async ({ gameId, challengerId, defenderId, propertyId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const property = game.boardState.find((p: any) => p.id === propertyId);
      if (!property) {
        socket.emit('error', { message: 'Property not found' });
        return;
      }

      // Create duel with a mock problem (in production, fetch from database)
      const mockProblem = {
        id: `problem-${Date.now()}`,
        title: 'Code Duel Challenge',
        description: 'Solve this problem faster than your opponent!',
        functionName: 'solution',
        functionSignatures: {
          javascript: 'function solution() {\n    // Your code here\n}',
          python: 'def solution():\n    # Your code here\n    pass',
          cpp: 'int solution() {\n    // Your code here\n    return 0;\n}',
          java: 'public int solution() {\n    // Your code here\n    return 0;\n}',
        },
        testCases: [],
        timeLimit: 300,
      };

      // Create duel
      game.activeDuel = {
        id: `duel-${Date.now()}`,
        challengerId,
        defenderId,
        propertyId,
        problemId: mockProblem.id,
        startTime: new Date(),
        status: 'active',
      };

      if (useMongoDB()) {
        await game.save();
      } else {
        updateGame(gameId, game);
      }

      io.to(gameId).emit('duel-started', {
        duel: game.activeDuel,
        problem: mockProblem,
        challengerId,
      });
    } catch (error) {
      console.error('Error starting duel:', error);
      socket.emit('error', { message: 'Failed to start duel' });
    }
  });

  // Submit code in duel
  socket.on('submit-duel-code', async ({ gameId, playerId, code, language }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game || !game.activeDuel) {
        socket.emit('error', { message: 'No active duel' });
        return;
      }

      const isChallenger = game.activeDuel.challengerId === playerId;
      const isDefender = game.activeDuel.defenderId === playerId;

      if (!isChallenger && !isDefender) {
        socket.emit('error', { message: 'You are not in this duel' });
        return;
      }

      // For now, accept the submission (in production, validate server-side)
      // Player solved it
      const solvedKey = isChallenger ? 'challengerSolved' : 'defenderSolved';
      game.activeDuel[solvedKey] = true;
      game.activeDuel[isChallenger ? 'challengerTime' : 'defenderTime'] = Date.now() - new Date(game.activeDuel.startTime).getTime();
      
      // Check if duel is over
      const challengerSolved = isChallenger || game.activeDuel.challengerSolved;
      const defenderSolved = isDefender || game.activeDuel.defenderSolved;

      if (challengerSolved && defenderSolved) {
        // Both solved - faster wins
        const challengerTime = game.activeDuel.challengerTime || Infinity;
        const defenderTime = game.activeDuel.defenderTime || Infinity;
        
        if (challengerTime < defenderTime) {
          game.activeDuel.status = 'challenger-won';
        } else {
          game.activeDuel.status = 'defender-won';
        }
      } else if (challengerSolved || defenderSolved) {
        // One solved first - they win
        if (challengerSolved) {
          game.activeDuel.status = 'challenger-won';
        } else {
          game.activeDuel.status = 'defender-won';
        }
      }

      if (useMongoDB()) {
        await game.save();
      } else {
        updateGame(gameId, game);
      }

      io.to(gameId).emit('duel-progress', {
        playerId,
        solved: true,
        time: game.activeDuel[isChallenger ? 'challengerTime' : 'defenderTime'],
      });

      if (game.activeDuel.status !== 'active') {
        // Duel is over
        await handleDuelEnd(game, io);
      }
    } catch (error) {
      console.error('Error submitting duel code:', error);
      socket.emit('error', { message: 'Failed to submit code' });
    }
  });

  // End turn (for manual turn ending or skipping)
  socket.on('end-turn', async ({ gameId, playerId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game || game.currentTurn !== playerId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      await endPlayerTurn(game, gameId, io);
    } catch (error) {
      console.error('Error ending turn:', error);
      socket.emit('error', { message: 'Failed to end turn' });
    }
  });

  // Pay rent
  socket.on('pay-rent', async ({ gameId, playerId, propertyId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const property = game.boardState.find((p: any) => p.id === propertyId);
      const player = game.players.find((p: any) => p.id === playerId);
      const owner = game.players.find((p: any) => p.id === property.ownerId);

      if (!property || !player || !owner) {
        socket.emit('error', { message: 'Invalid property or player' });
        return;
      }

      const rent = calculateRent(property);
      player.money -= rent;
      owner.money += rent;

      if (useMongoDB()) {
        await game.save();
      } else {
        updateGame(gameId, game);
      }

      io.to(gameId).emit('rent-paid', {
        playerId,
        ownerId: owner.id,
        propertyId,
        amount: rent,
      });

      // Automatically end turn after paying rent
      console.log(`💸 Rent paid by ${player.name}, ending turn...`);
      try {
        await endPlayerTurn(game, gameId, io);
      } catch (turnError) {
        console.error('Error ending turn after rent payment:', turnError);
      }
    } catch (error) {
      console.error('Error paying rent:', error);
      socket.emit('error', { message: 'Failed to pay rent' });
    }
  });

  // Upgrade property
  socket.on('upgrade-property', async ({ gameId, playerId, propertyId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const property = game.boardState.find((p: any) => p.id === propertyId);
      const player = game.players.find((p: any) => p.id === playerId);

      if (!property || property.ownerId !== playerId || property.houses >= 5) {
        socket.emit('error', { message: 'Cannot upgrade this property' });
        return;
      }

      const houseCost = property.houseCost || 50;
      if (player.money < houseCost) {
        socket.emit('error', { message: 'Not enough money' });
        return;
      }

      property.houses += 1;
      player.money -= houseCost;

      if (useMongoDB()) {
        await game.save();
      } else {
        updateGame(gameId, game);
      }

      io.to(gameId).emit('property-upgraded', {
        playerId,
        propertyId,
        houses: property.houses,
      });
    } catch (error) {
      console.error('Error upgrading property:', error);
      socket.emit('error', { message: 'Failed to upgrade property' });
    }
  });

  // Duel code update
  socket.on('duel-code-update', ({ gameId, playerId, code }) => {
    io.to(gameId).emit('duel-code-update', { playerId, code });
  });

  // Game time up
  socket.on('game-time-up', async ({ gameId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game) return;

      game.status = 'finished';

      if (useMongoDB()) {
        await game.save();
      } else {
        updateGame(gameId, game);
      }

      const winnerName = computeWinnerName(game.players);
      await recordGameResult(game.players, winnerName);

      io.to(gameId).emit('game-over', { gameId, winnerName });
    } catch (error) {
      console.error('Error ending game:', error);
    }
  });

  // Get game state
  socket.on('get-game-state', async ({ gameId }) => {
    try {
      const game = await getGameById(gameId);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Ensure boardState exists and is properly formatted
      const gameState = {
        ...game.toObject ? game.toObject() : game,
        boardState: game.boardState || [],
        players: game.players || [],
      };

      socket.emit('game-state', gameState);
    } catch (error) {
      console.error('Error getting game state:', error);
      socket.emit('error', { message: 'Failed to get game state' });
    }
  });
}

async function handleDuelEnd(game: any, io: Server) {
  const duel = game.activeDuel;
  const property = game.boardState.find((p: any) => p.id === duel.propertyId);
  const challenger = game.players.find((p: any) => p.id === duel.challengerId);
  const defender = game.players.find((p: any) => p.id === duel.defenderId);

  if (duel.status === 'challenger-won') {
    // Challenger wins - no rent, steal house
    if (property.houses > 0) {
      property.houses -= 1;
    }
  } else {
    // Defender wins - challenger pays double rent
    const rent = calculateRent(property);
    challenger.money -= rent * 2;
    defender.money += rent * 2;
  }

  game.activeDuel = undefined;
  
  if (useMongoDB()) {
    await game.save();
  } else {
    updateGame(game._id.toString(), game);
  }

  io.to(game._id.toString()).emit('duel-ended', {
    winner: duel.status === 'challenger-won' ? duel.challengerId : duel.defenderId,
    result: duel.status,
  });
}

function applyCardEffect(game: any, player: any, card: DebuggingCard, io: Server, gameId: string) {
  if (card.effect.money) {
    player.money += card.effect.money;
    if (card.effect.money > 0) {
      io.to(gameId).emit('card-effect', {
        playerId: player.id,
        message: `${player.name} ${card.message}`,
        moneyChange: card.effect.money,
      });
    }
  }
  
  if (card.effect.move) {
    const newPosition = (player.position + card.effect.move + 40) % 40;
    player.position = newPosition;
    io.to(gameId).emit('card-effect', {
      playerId: player.id,
      message: `${player.name} ${card.message}`,
      newPosition,
    });
  }
  
  if (useMongoDB()) {
    game.save();
  } else {
    updateGame(gameId, game);
  }
}

function calculateRent(property: any): number {
  const baseRent = property.rent || 0;
  const numSolutions = property.houses || 0;
  
  // Determine difficulty multiplier based on property price/category
  let difficultyMultiplier = 1.0; // Easy (default)
  if (property.price > 200) {
    difficultyMultiplier = 2.0; // Hard
  } else if (property.price > 100) {
    difficultyMultiplier = 1.5; // Medium
  }
  
  // Dynamic rent formula: Base Rent × (1 + (Number of Solutions × Difficulty Multiplier))
  const rent = baseRent * (1 + (numSolutions * difficultyMultiplier));
  
  // Fallback to original calculation if houses array exists
  if (property.rentWithHouse && property.rentWithHouse.length > 0) {
    if (numSolutions === 0) {
      return baseRent;
    } else if (numSolutions >= 4) {
      return property.rentWithHotel || rent;
    } else {
      return property.rentWithHouse[numSolutions - 1] || rent;
    }
  }
  
  return Math.round(rent);
}

