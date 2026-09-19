import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import PixelBoard from '../components/PixelBoard';
import CurrentActionDisplay from '../components/CurrentActionDisplay';
import FullCodeChallengeModal from '../components/FullCodeChallengeModal';
import CodeDuelModal from '../components/CodeDuelModal';
import GameOverModal from '../components/GameOverModal';
import EnhancedLiveFeed from '../components/EnhancedLiveFeed';
import DebuggingCardModal from '../components/DebuggingCardModal';
import PropertyCardModal from '../components/PropertyCardModal';
import { NotificationToast, useNotifications } from '../components/NotificationToast';
import MoneyTransferEffect, { FloatingMoneyChange } from '../components/MoneyTransferEffect';
import { useGameEffects } from '../hooks/useGameEffects';
import DiceParticles from '../components/particles/DiceParticles';
import ConfettiParticles from '../components/particles/ConfettiParticles';
import GoldenRingEffect from '../components/particles/GoldenRingEffect';
import { getProblemForProperty, getRandomProblemByDifficulty } from '../data/problemBank';
import { executeCode } from '../services/judge0Service';
import type { Problem } from '../data/problemBank';

// Turn Timer Component for Right Sidebar
function TurnTimerDisplay({ duration, isPaused, turnNumber }: { duration: number; isPaused: boolean; turnNumber?: number }) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    // Reset timer when turn changes
    setTimeRemaining(duration);
  }, [turnNumber, duration]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [duration, isPaused, turnNumber]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeRemaining / duration) * 100;
  
  // Color changes based on time remaining (green → yellow → red)
  const getTimerColor = () => {
    if (progress > 50) return 'text-emerald-400'; // Green for >50%
    if (progress > 25) return 'text-yellow-400'; // Yellow for 25-50%
    return 'text-red-400'; // Red for <25%
  };
  
  const getProgressColor = () => {
    if (progress > 50) return 'text-emerald-400'; // Green
    if (progress > 25) return 'text-yellow-400'; // Yellow
    return 'text-red-400'; // Red
  };

  return (
    <>
      <div className={`font-bold font-mono mb-1 ${getTimerColor()}`} style={{ fontSize: 'clamp(25px, 2.5vmin, 35px)' }}>
        {formatTime(timeRemaining)}
      </div>
      {/* Circular Progress Bar - 25% larger */}
      <div className="relative mx-auto" style={{ width: 'clamp(25px, 2.5vmin, 35px)', height: 'clamp(25px, 2.5vmin, 35px)' }}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-slate-700"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 40}`}
            initial={{ pathLength: 1 }}
            animate={{ pathLength: progress / 100 }}
            transition={{ duration: 0.5, ease: 'linear' }}
            className={getProgressColor()}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`font-bold font-mono ${getTimerColor()}`} style={{ fontSize: 'clamp(10px, 1vmin, 14px)' }}>{Math.round(progress)}%</div>
            <div className="text-white/60 font-mono" style={{ fontSize: 'clamp(8px, 0.8vmin, 11px)' }}>left</div>
          </div>
        </div>
      </div>
    </>
  );
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

interface GameState {
  _id: string;
  roomCode: string;
  status: string;
  players: any[];
  currentTurn: string;
  turnNumber: number;
  boardState: any[];
  activeDuel?: any;
  startTime?: number;
}

interface GameEvent {
  id: string;
  type: 'info' | 'dice' | 'purchase' | 'rent' | 'duel' | 'special' | 'upgrade' | 'bankrupt' | 'land';
  message: string;
  timestamp: number;
  player?: string;
  playerAvatar?: string;
  property?: string;
  amount?: number;
}

const COLOR_TO_TIER: Record<string, 'brown' | 'lightblue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'darkblue' | 'railroad' | 'utility' | 'special'> = {
  '#8B4513': 'brown',
  '#87CEEB': 'lightblue',
  '#FF69B4': 'pink',
  '#FF8C00': 'orange',
  '#DC143C': 'red',
  '#FFD700': 'yellow',
  '#228B22': 'green',
  '#00008B': 'darkblue',
  '#000000': 'railroad',
  '#FFFFFF': 'utility',
  transparent: 'special',
};

const TIER_TO_DIFFICULTY: Record<string, 'easy' | 'medium' | 'hard'> = {
  brown: 'easy',
  lightblue: 'easy',
  pink: 'medium',
  orange: 'medium',
  red: 'medium',
  yellow: 'hard',
  green: 'hard',
  darkblue: 'hard',
  railroad: 'medium',
  utility: 'medium',
  special: 'medium',
};

const getPropertyTier = (property: any): string | null => {
  if (!property) return null;
  if (property.isRailroad) return 'railroad';
  if (property.isUtility) return 'utility';
  if (property.isSpecial) return 'special';
  const tier = COLOR_TO_TIER[property.color as keyof typeof COLOR_TO_TIER];
  return tier || null;
};

const getDifficultyForProperty = (property: any): 'easy' | 'medium' | 'hard' => {
  const tier = getPropertyTier(property);
  if (!tier) {
    // fallback by price
    if (property.price <= 100) return 'easy';
    if (property.price <= 200) return 'medium';
    return 'hard';
  }
  return TIER_TO_DIFFICULTY[tier];
};

const describeProperty = (property: any) => {
  if (!property) return 'Unknown space';
  if (property.specialType) {
    return property.name;
  }
  return property.name;
};

const getPlayerNameById = (players: any[], id: string | null | undefined) => {
  if (!id) return 'Player';
  const player = players?.find?.((p: any) => p.id === id);
  return player?.name || 'Player';
};

export default function GameRoom() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { playerId } = location.state || {};

  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showDuelModal, setShowDuelModal] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showPropertyCardModal, setShowPropertyCardModal] = useState(false);
  const [landedProperty, setLandedProperty] = useState<any>(null);
  const [landedPosition, setLandedPosition] = useState<number | undefined>();
  const [actionType, setActionType] = useState<'awaiting-action' | 'dice-rolling' | 'landed-unowned' | 'landed-owned' | 'landed-opponent' | 'landed-special' | 'landed-tax' | null>('awaiting-action');
  const [diceResult, setDiceResult] = useState<{ dice1: number; dice2: number; total: number } | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [duelOpponentCode, setDuelOpponentCode] = useState('');
  const [duelOpponentStatus, setDuelOpponentStatus] = useState<'solving' | 'completed' | 'failed'>('solving');
  const [myDuelCode, setMyDuelCode] = useState('');
  const [debuggingCard, setDebuggingCard] = useState<any>(null);
  const [moneyTransfers, setMoneyTransfers] = useState<any[]>([]);
  const [floatingChanges, setFloatingChanges] = useState<any[]>([]);

  const hasLoggedStartRef = useRef(false);
  const previousTurnRef = useRef<string | null>(null);
  const playersRef = useRef<any[]>([]);
  const previousMoneyRef = useRef<{ [key: string]: number }>({});

  // Enhanced UI hooks
  const { notifications, showNotification, closeNotification } = useNotifications();
  const effects = useGameEffects();

  useEffect(() => {
    if (!gameId || !playerId) {
      console.error('Missing gameId or playerId:', { gameId, playerId });
      navigate('/');
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Connection error handling
    newSocket.on('connect', () => {
      // Socket connected successfully
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      alert('Failed to connect to game server. Please refresh the page.');
    });

    // Join game
    newSocket.emit('join-game', { gameId, playerId });

    // Listen for game state updates
    newSocket.on('game-state', (state: GameState) => {
      if (!state || !state.boardState || state.boardState.length === 0) {
        return;
      }

      // Only update if state actually changed (prevent unnecessary re-renders)
      const normalizedState: GameState = {
        ...state,
        startTime: state.startTime
          ? new Date(state.startTime).getTime()
          : gameState?.startTime || Date.now(),
      };

      // Use functional update to prevent stale closures
      setGameState(prevState => {
        // Skip update if state hasn't meaningfully changed (optimize performance)
        if (prevState && 
            prevState.currentTurn === normalizedState.currentTurn &&
            prevState.turnNumber === normalizedState.turnNumber &&
            prevState.status === normalizedState.status &&
            prevState.players.length === normalizedState.players.length) {
          // Quick check: compare player positions and money (most frequently changing)
          const playersChanged = prevState.players.some((p: any, i: number) => {
            const newPlayer = normalizedState.players[i];
            return !newPlayer || 
                   p.position !== newPlayer.position || 
                   p.money !== newPlayer.money ||
                   p.id !== newPlayer.id;
          });
          if (!playersChanged) {
            return prevState; // No meaningful changes, skip update
          }
        }
        return normalizedState;
      });
      
      playersRef.current = normalizedState.players;

      if (!hasLoggedStartRef.current) {
        const firstPlayerName = getPlayerNameById(normalizedState.players, normalizedState.currentTurn);
        addEvent({
          type: 'info',
          message: `🎮 Game started! ${firstPlayerName}'s turn`,
        });
        hasLoggedStartRef.current = true;
        previousTurnRef.current = normalizedState.currentTurn;
      } else if (previousTurnRef.current !== normalizedState.currentTurn) {
        const nextPlayerName = getPlayerNameById(normalizedState.players, normalizedState.currentTurn);
        addEvent({
          type: 'info',
          message: `🎯 ${nextPlayerName}'s turn`,
        });
        previousTurnRef.current = normalizedState.currentTurn;
      }

      if (normalizedState.status === 'finished') {
        setShowGameOver(true);
      }
    });

    newSocket.on('joined-game', () => {
      // Request game state immediately after joining
      newSocket.emit('get-game-state', { gameId });
    });

    // Listen for when other players join
    newSocket.on('player-joined', (data: any) => {
      const { playerName, playerAvatar } = data;
      
      // Show notification
      showNotification('success', 'Player Joined!', `${playerName} joined the game`, 3000);
      
      // Add event to log
      addEvent({
        type: 'info',
        message: `🎮 ${playerName} joined the game`,
        player: playerName,
        playerAvatar: playerAvatar,
      });
      
      // Game state will be automatically updated via the 'game-state' event
    });

    // Also request game state immediately in case we missed the joined-game event
    setTimeout(() => {
      newSocket.emit('get-game-state', { gameId });
    }, 100);

    newSocket.on('dice-rolled', (data: any) => {
      const rollerId = data.playerId;
      const rollerName = getPlayerNameById(playersRef.current, rollerId);

      // Only update dice result and action type if it's the current player
      if (rollerId === playerId) {
        setDiceResult({ dice1: data.dice[0], dice2: data.dice[1], total: data.total });
        setActionType('dice-rolling');
        setLandedPosition(data.newPosition);
      }
      
      // Trigger particle effects
      if (rollerId === playerId) {
        effects.triggerDiceRoll();
      }
      
      addEvent({
        type: 'dice',
        message: `${rollerName} rolled ${data.total} (${data.dice[0]} + ${data.dice[1]})`,
        player: rollerName,
        playerAvatar: playersRef.current.find(p => p.id === rollerId)?.avatar,
      });
      
      showNotification('info', 'Dice Rolled!', `${rollerName} rolled ${data.total}`, 3000);
      
      setTimeout(() => {
        newSocket.emit('get-game-state', { gameId });
      }, 2000);
    });

    newSocket.on('landed-on-space', (data: any) => {
      if (!data.property) return;

      const landedPlayerId = data.playerId;
      const property = data.property;

      const activePlayerName = getPlayerNameById(playersRef.current, landedPlayerId);
      const propertyName = describeProperty(property);
      const activePlayer = playersRef.current.find((p: any) => p.id === landedPlayerId);
      
      // Add event immediately
      addEvent({
        type: property.isSpecial ? 'special' : 'land',
        message: `${activePlayerName} landed on ${propertyName}`,
        player: activePlayerName,
        playerAvatar: activePlayer?.avatar,
        property: propertyName,
      });

      // Only process actions for the player who landed
      if (landedPlayerId !== playerId) return;

      // Add 2-second delay before showing property info
      setTimeout(() => {
        // Update state for the player who actually landed
        setLandedProperty(property);
        setLandedPosition(property.position);

      if (property.isSpecial) {
        setActionType('landed-special');
        handleSpecialSpace(property);
        return;
      }

      if (property.specialType === 'income-tax' || property.specialType === 'luxury-tax') {
        setActionType('landed-tax');
        addEvent({
          type: 'rent',
          message: `💸 ${activePlayerName} must pay ${property.name}`,
          player: playerId,
        });
        return;
      }

      // Show property card modal for all properties
      setShowPropertyCardModal(true);
      
      if (data.canBuy) {
        setActionType('landed-unowned');
        const difficulty = getDifficultyForProperty(property);
        const problem = getProblemForProperty(property) || getRandomProblemByDifficulty(difficulty);
        if (problem) {
          setCurrentProblem(problem);
        }
        return;
      }

      if (data.mustPayRent) {
        setActionType('landed-opponent');
        const ownerName = getPlayerNameById(playersRef.current, property.ownerId);
        const rentAmount = property.houses === 0
          ? property.rent
          : property.rentWithHouse?.[Math.max(property.houses - 1, 0)] || property.rent;
        addEvent({
          type: 'rent',
          message: `💰 ${activePlayerName} owes $${rentAmount} to ${ownerName}`,
          player: playerId,
        });
        return;
      }

      if (property.ownerId === playerId) {
        setActionType('landed-owned');
        addEvent({
          type: 'info',
          message: `🏠 ${activePlayerName} is visiting their own ${propertyName}`,
          player: playerId,
        });
      } else {
        setActionType('awaiting-action');
      }
      }, 2000); // 2-second delay
    });

    newSocket.on('property-bought', (data: any) => {
      const property = gameState?.boardState.find((p: any) => p.id === data.propertyId);
      
      // Trigger celebration effects
      if (data.playerId === playerId && property) {
        effects.triggerPurchaseCelebration(property.color);
      }
      
      addEvent({
        type: 'purchase',
        message: `${data.playerName || 'Player'} bought ${data.propertyName}`,
        player: data.playerName || 'Player',
        playerAvatar: playersRef.current.find(p => p.id === data.playerId)?.avatar,
        property: data.propertyName,
        amount: property?.price,
      });
      
      showNotification('property', 'Property Purchased!', `${data.playerName} bought ${data.propertyName}`, 5000);
      
      setShowChallengeModal(false);
      setLandedProperty(null);
      setLandedPosition(undefined);
      setCurrentProblem(null);
      setActionType(null);
      newSocket.emit('get-game-state', { gameId });
    });

    newSocket.on('duel-started', (data: any) => {
      const problem = data.problem;
      setCurrentProblem(problem);
      setShowDuelModal(true);
      setDuelOpponentCode('');
      setDuelOpponentStatus('solving');
      setMyDuelCode('');
      
      addEvent({
        type: 'duel',
        message: `⚔️ Code Duel started!`,
        player: data.challengerId,
      });
    });

    newSocket.on('duel-code-update', (data: any) => {
      if (data.playerId !== playerId) {
        setDuelOpponentCode(data.code);
      }
    });

    newSocket.on('duel-progress', (data: any) => {
      if (data.playerId !== playerId) {
        setDuelOpponentStatus(data.solved ? 'completed' : 'failed');
      }
    });

    newSocket.on('duel-ended', (data: any) => {
      const winner = playersRef.current.find((p: any) => p.id === data.winner);
      addEvent({
        type: 'duel',
        message: `🏆 ${winner?.name || 'Player'} won the code duel!`,
        player: data.winner,
      });
      toast.success(data.winner === playerId ? '🎉 You won the duel!' : '💔 You lost the duel');
      setShowDuelModal(false);
      setCurrentProblem(null);
      newSocket.emit('get-game-state', { gameId });
    });

    newSocket.on('turn-ended', (data: any) => {
      const nextPlayerName = data.nextPlayerName || getPlayerNameById(playersRef.current, data.nextPlayerId);
      
      setActionType(null);
      setDiceResult(null);
      setLandedProperty(null);
      setShowChallengeModal(false);
      
      // Add event to log
      addEvent({
        type: 'info',
        message: `🔄 Turn switched to ${nextPlayerName}`,
        player: nextPlayerName,
      });
      
      // Show notification
      if (data.nextPlayerId === playerId) {
        showNotification('success', 'Your Turn!', `It's your turn to roll the dice`, 3000);
      } else {
        showNotification('info', 'Turn Changed', `${nextPlayerName}'s turn`, 2000);
      }
      
      newSocket.emit('get-game-state', { gameId });
    });

    newSocket.on('debugging-card-drawn', (data: any) => {
      setDebuggingCard(data.card);
      addEvent({
        type: 'special',
        message: `🎴 ${getPlayerNameById(playersRef.current, data.playerId)} drew: ${data.card.title} - ${data.card.message}`,
        player: data.playerId,
      });
    });

    newSocket.on('card-effect', (data: any) => {
      if (data.moneyChange) {
        addEvent({
          type: data.moneyChange > 0 ? 'special' : 'rent',
          message: `💰 ${data.message}`,
          player: data.playerId,
        });
      }
      newSocket.emit('get-game-state', { gameId });
    });

    newSocket.on('error', (error: any) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    newSocket.on('disconnect', () => {
      console.warn('Socket disconnected');
    });

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.close();
    };
  }, [gameId, playerId, navigate]);

  const addEvent = (event: Omit<GameEvent, 'id' | 'timestamp'>) => {
    setGameEvents(prev => {
      const entry: GameEvent = {
        ...event,
        id: `event-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };
      const next = [...prev, entry];
      return next.slice(-10);
    });
  };

  const handleSpecialSpace = (property: any) => {
    if (property.specialType === 'go-to-jail') {
      // Move to jail
      toast.error('🚨 Go to Jail!');
      addEvent({ type: 'special', message: '🚨 Sent directly to Jail!', player: playerId });
    } else if (property.specialType === 'chance') {
      // Draw chance card
      toast('🎲 Chance card drawn!', { icon: '🎲' });
      addEvent({ type: 'special', message: '🎲 Drew a Chance card', player: playerId });
    } else if (property.specialType === 'community-chest') {
      // Draw community chest card
      toast('📦 Community Chest card drawn!', { icon: '📦' });
      addEvent({ type: 'special', message: '📦 Drew a Community Chest card', player: playerId });
      } else if (property.specialType === 'go') {
      // Trigger GO celebration
      if (playerId) {
        effects.triggerGoPass();
      }
      showNotification('money', 'Passed GO!', 'Collect $200', 4000);
      addEvent({ type: 'special', message: 'Passed GO and collected $200', player: playerId });
    }
  };

  const handleRollDice = () => {
    if (!socket || !gameId || !playerId) return;

    if (playersRef.current.length < 2) {
      toast.error('You need at least 2 players. Share your room code and wait for a friend to join.');
      return;
    }

    // If dice values are provided (from EnhancedDiceRoller), we still let the server roll
    // The server will generate the actual dice values
    socket.emit('roll-dice', { gameId, playerId });
  };

  const handleSolveAndBuy = async (code: string, language: string) => {
    if (!currentProblem || !landedProperty || !socket || !gameId || !playerId) return;

    // Validate code is not empty
    if (!code || code.trim().length === 0) {
      toast.error('❌ Please write some code before submitting!', {
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    // Check if code is just the function signature (no implementation)
    const trimmedCode = code.trim();
    const functionSignature = currentProblem.functionSignatures?.[language as keyof typeof currentProblem.functionSignatures] || '';
    if (trimmedCode === functionSignature.trim() || trimmedCode.length < functionSignature.length + 10) {
      toast.error('❌ Please implement the function! Empty or incomplete solutions are not accepted.', {
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    try {
      // Actually validate the code with test cases
      const testResults = await executeCode(code, language, currentProblem.testCases);
      
      // Check if all tests passed
      const allTestsPassed = testResults.every(result => result.passed);
      const passedCount = testResults.filter(r => r.passed).length;
      const totalTests = testResults.length;

      if (!allTestsPassed) {
        // Show failure notification with details
        toast.error(
          `❌ FAILED: Only ${passedCount}/${totalTests} test cases passed!`, 
          {
            duration: 5000,
            icon: '❌',
          }
        );

        // Show detailed error messages
        const failedTests = testResults.filter(r => !r.passed);
        failedTests.forEach((test, idx) => {
          setTimeout(() => {
            toast.error(
              `Test ${idx + 1} Failed: Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(test.actual)}${test.error ? ` - ${test.error}` : ''}`,
              { duration: 4000 }
            );
          }, idx * 500);
        });

        return; // Don't proceed with purchase
      }

      // All tests passed - proceed with purchase
    const playerName = getPlayerNameById(playersRef.current, playerId);
    const coinsEarned = landedProperty.price;
    
    // Show success notification
      toast.success(`✅ PASS: All ${totalTests} test cases passed! +${coinsEarned} Algo-Coins`, {
      duration: 4000,
      icon: '🎉',
    });

    addEvent({
      type: 'purchase',
      message: `✅ ${playerName} solved "${currentProblem.title}"! +${coinsEarned} A-C`,
      player: playerId,
    });

    // Automatically deduct cost and buy property
    socket.emit('buy-property', {
      gameId,
      playerId,
      propertyId: landedProperty.id,
      code,
      language,
    });

    // Close modal after a brief delay
    setTimeout(() => {
      setShowChallengeModal(false);
      setCurrentProblem(null);
      setLandedProperty(null);
      setActionType(null);
    }, 1500);
    } catch (error: any) {
      console.error('Code execution error:', error);
      toast.error(`❌ Execution Error: ${error.message || 'Failed to execute code'}`, {
        duration: 5000,
        icon: '⚠️',
      });
    }
  };

  const handlePayRent = () => {
    if (socket && gameId && playerId && landedProperty) {
      // Emit pay rent event
      socket.emit('pay-rent', { gameId, playerId, propertyId: landedProperty.id });
      const ownerName = getPlayerNameById(playersRef.current, landedProperty.ownerId);
      const rentAmount = landedProperty.houses === 0
        ? landedProperty.rent
        : landedProperty.rentWithHouse?.[Math.max(landedProperty.houses - 1, 0)] || landedProperty.rent;
      addEvent({
        type: 'rent',
        message: `💸 ${getPlayerNameById(playersRef.current, playerId)} paid $${rentAmount} to ${ownerName}`,
        player: playerId,
      });
      setActionType(null);
      setLandedProperty(null);
    }
  };

  const handleCodeDuel = () => {
    if (socket && gameId && playerId && landedProperty) {
      const owner = playersRef.current.find((p: any) => p.id === landedProperty.ownerId);
      if (owner) {
        socket.emit('challenge-duel', {
          gameId,
          challengerId: playerId,
          defenderId: owner.id,
          propertyId: landedProperty.id,
        });
        addEvent({
          type: 'duel',
          message: `⚔️ ${getPlayerNameById(playersRef.current, playerId)} challenged ${owner.name} to a code duel!`,
          player: playerId,
        });
      }
    }
  };

  const handlePropertyCardBuy = () => {
    if (!currentProblem) {
      // Get problem if not already set
      const difficulty = getDifficultyForProperty(landedProperty);
      const problem = getProblemForProperty(landedProperty) || getRandomProblemByDifficulty(difficulty);
      if (problem) {
        setCurrentProblem(problem);
      }
    }
    setShowPropertyCardModal(false);
    setShowChallengeModal(true);
  };

  const handlePropertyCardSkip = () => {
    setShowPropertyCardModal(false);
    setActionType(null);
    setLandedProperty(null);
    setLandedPosition(undefined);
  };

  const handleUpgrade = () => {
    if (socket && gameId && playerId && landedProperty) {
      socket.emit('upgrade-property', {
        gameId,
        playerId,
        propertyId: landedProperty.id,
      });
      toast.success('🏠 Property upgraded!');
      addEvent({
        type: 'upgrade',
        message: `🏠 ${getPlayerNameById(playersRef.current, playerId)} upgraded ${describeProperty(landedProperty)}`,
        player: playerId,
      });
      setActionType(null);
      setLandedProperty(null);
    }
  };

  const handleDuelCodeUpdate = (code: string) => {
    setMyDuelCode(code);
    if (socket && gameId && playerId) {
      socket.emit('duel-code-update', { gameId, playerId, code });
    }
  };

  const handleDuelWin = () => {
    if (socket && gameId && playerId) {
      socket.emit('submit-duel-code', {
        gameId,
        playerId,
        code: myDuelCode,
        language: 'javascript',
      });
    }
  };

  const handleDuelLose = () => {
    // Duel lost - handled by server
  };

  const handleTimeUp = () => {
    if (socket && gameId) {
      socket.emit('game-time-up', { gameId });
    }
    addEvent({
      type: 'info',
      message: '⏰ Time is up! Calculating winner...',
      player: playerId,
    });
  };

  // Memoize net worth calculation to prevent expensive recalculations
  const calculateNetWorth = useCallback((player: any) => {
    if (!gameState?.boardState || !player) return player?.money || 0;
    const propertyValue = gameState.boardState
      .filter(p => p.ownerId === player.id)
      .reduce((sum, p) => sum + p.price + (p.houses * (p.houseCost || 0)), 0);
    return player.money + propertyValue;
  }, [gameState?.boardState]);

  useEffect(() => {
    if (!gameState) return;

    const isPlayersTurn = gameState.currentTurn === playerId;

    if (isPlayersTurn) {
      if (!diceResult && !showChallengeModal && !showDuelModal && !landedProperty) {
        setActionType(prev => (prev === null ? 'awaiting-action' : prev));
      }
    } else if (actionType === 'awaiting-action') {
      setActionType(null);
    }
  }, [gameState, playerId, diceResult, showChallengeModal, showDuelModal, landedProperty, actionType]);

  // Track money changes for animations - MUST be before early return
  useEffect(() => {
    if (!gameState || !gameState.players) return;
    
    gameState.players.forEach((player: any) => {
      const prevMoney = previousMoneyRef.current[player.id] || player.money;
      if (prevMoney !== player.money) {
        const change = player.money - prevMoney;
        if (change !== 0 && Math.abs(change) > 0) {
          // Add floating money change
          const floatingChange = {
            id: `${player.id}-${Date.now()}`,
            amount: change,
            position: { 
              x: window.innerWidth / 2, 
              y: window.innerHeight / 2 
            },
          };
          setFloatingChanges(prev => [...prev, floatingChange]);
          
          // Show notification for significant changes
          if (Math.abs(change) >= 200) {
            showNotification(
              'money',
              change > 0 ? 'Money Received!' : 'Money Spent!',
              `${change > 0 ? '+' : ''}$${Math.abs(change)}`,
              3000
            );
          }
        }
        previousMoneyRef.current[player.id] = player.money;
      }
    });
  }, [gameState?.players, showNotification]);

  // Memoize winner calculation to prevent expensive recalculations - MUST be before early return
  const winner = useMemo(() => {
    if (!gameState || gameState.status !== 'finished' || !gameState.players.length) {
      return null;
    }
    return gameState.players.reduce((prev, curr) => 
      calculateNetWorth(curr) > calculateNetWorth(prev) ? curr : prev
    );
  }, [gameState?.status, gameState?.players, calculateNetWorth]);

  // Memoize players with net worth to prevent recalculation on every render - MUST be before early return
  const playersWithNetWorth = useMemo(() => {
    if (!gameState?.players) return [];
    return gameState.players.map((p: any) => ({
      ...p,
      netWorth: calculateNetWorth(p),
    }));
  }, [gameState?.players, calculateNetWorth]);

  if (!gameState || !gameState.boardState || gameState.boardState.length === 0) {
    return (
      <div className="px-theme px-sky-bg min-h-screen flex items-center justify-center flex-col gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-white border-t-transparent rounded-full"
        />
        <div className="px-head text-white" style={{ fontSize: '0.9rem', textShadow: '2px 2px 0 rgba(0,0,0,0.4)' }}>LOADING WORLD...</div>
        {socket && (
          <div className="text-white/60 text-sm font-mono">
            Socket: {socket.connected ? '✅ Connected' : '❌ Disconnected'}
          </div>
        )}
        {gameId && (
          <div className="text-white/60 text-sm font-mono">
            Game ID: {gameId}
          </div>
        )}
        {playerId && (
          <div className="text-white/60 text-sm font-mono">
            Player ID: {playerId}
          </div>
        )}
        <button
          onClick={() => {
            if (socket && gameId) {
              console.log('Manually requesting game state');
              socket.emit('get-game-state', { gameId });
            }
          }}
          className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-mono"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const currentPlayer = gameState.players.find((p: any) => p.id === playerId);
  const totalPlayers = gameState.players.length;
  const hasEnoughPlayers = totalPlayers >= 2;
  const playersNeeded = Math.max(0, 2 - totalPlayers);
  const isMyTurn = gameState.currentTurn === playerId;
  const propertyOwner = landedProperty?.ownerId 
    ? gameState.players.find((p: any) => p.id === landedProperty.ownerId)
    : null;
  const rent = landedProperty && propertyOwner 
    ? (landedProperty.houses === 0 
        ? landedProperty.rent 
        : landedProperty.rentWithHouse?.[landedProperty.houses - 1] || landedProperty.rent)
    : 0;

  return (
    <div className="game-container px-theme px-sky-bg">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            color: '#fff',
            border: '2px solid #10b981',
            borderRadius: '12px',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
            fontSize: '15px',
            fontWeight: '600',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* Top Header Bar - Full Width - Ultra Compact */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-lg border-b border-emerald-500/20 shadow-md">
        <div className="container mx-auto px-2 py-1.5 flex items-center justify-between">
          {/* Left: CODEOPOLY + Room Code */}
          <div className="flex items-center gap-3">
            <h1 className="px-head text-white" style={{ fontSize: '0.8rem' }}><span style={{ color: '#ff6b6b' }}>CODE</span>POLY</h1>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(gameState.roomCode);
                    showNotification('success', 'Copied!', `Room code ${gameState.roomCode} copied to clipboard`, 2000);
                  }}
              className="px-2.5 py-0.5 bg-slate-700/50 hover:bg-slate-600/50 rounded-full text-xs text-white/80 font-mono border border-slate-600 transition-colors"
                  title="Click to copy"
                >
              Room {gameState.roomCode}
                </button>
              </div>

          {/* Center: Active Status + Player Count */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-700/50 rounded-full border border-slate-600">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-xs text-white/80 font-mono">CODEPOLY ACTIVE</span>
            </div>
            <span className="text-xs text-white/60 font-mono">• {gameState.players.length} players</span>
          </div>

          {/* Right: Current Player */}
          {gameState.currentTurn && (() => {
            const currentPlayer = gameState.players.find((p: any) => p.id === gameState.currentTurn);
            return currentPlayer ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 font-mono">CURRENT PLAYER</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xs">
                    {currentPlayer.avatar}
                  </div>
                  <span className="text-xs font-bold text-white font-mono">{currentPlayer.name}</span>
                </div>
                <span className="text-xs text-white/60 font-mono">Turn {gameState.turnNumber}</span>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Main Game Area - Three Column Layout */}
      <div className="pt-8 pb-1 h-screen overflow-hidden">
        <div className="container mx-auto px-2 h-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-12 gap-2 h-full"
          >
            {/* Left Sidebar - PLAYERS + LIVE FEED */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="col-span-2 flex flex-col gap-2 overflow-hidden relative"
              style={{ maxHeight: 'calc(100vh - 2rem)', zIndex: 10 }}
            >
              {/* PLAYERS Section - Ultra Compact */}
              <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded border border-emerald-500/20 shadow-lg p-2 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">PLAYERS</h2>
                  <span className="text-[9px] text-white/50 font-mono">{gameState.players.length}/4</span>
                </div>
                <div className="space-y-1">
                  {gameState.players.map((player) => {
                    const isCurrentTurn = player.id === gameState.currentTurn;
                    const isYou = player.id === playerId;
                    return (
                      <div
                        key={player.id}
                        className={`p-1.5 rounded border ${
                          isCurrentTurn 
                            ? 'bg-emerald-500/15 border-emerald-400/30' 
                            : isYou
                            ? 'bg-slate-800/40 border-slate-600/30'
                            : 'bg-slate-800/20 border-slate-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {player.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold text-white font-mono truncate">{player.name}</div>
                            <div className="text-[9px] text-emerald-400 font-mono">${player.money.toLocaleString()}</div>
                          </div>
                          {isYou && (
                            <span className="text-[9px] bg-emerald-500 text-white px-1 py-0.5 rounded font-bold flex-shrink-0">YOU</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIVE FEED Section - Ultra Compact */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded border border-emerald-500/20 shadow-lg p-2 h-full flex flex-col" style={{ marginBottom: '0.5rem' }}>
                  <div className="flex items-center gap-1 mb-1.5 flex-shrink-0">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                    <h2 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">LIVE FEED</h2>
                    <span className="text-[9px] text-emerald-400 font-mono">LIVE</span>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <EnhancedLiveFeed 
                      events={gameEvents.map(e => {
                        const player = gameState.players.find((p: any) => p.id === e.player || p.name === e.player);
                        return {
                          id: e.id,
                          type: (e.type === 'info' ? 'special' : e.type) as any,
                          message: e.message,
                          timestamp: e.timestamp,
                          player: e.player || player?.name || 'Player',
                          playerAvatar: player?.avatar,
                        };
                      })}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Center Board Area - Larger and More Prominent */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="col-span-8 flex flex-col items-center justify-center relative z-20"
              style={{ minHeight: 0, isolation: 'isolate' }}
            >
              {/* CURRENT TURN Display Above Board - More Prominent */}
              {gameState.currentTurn && (() => {
                const currentPlayer = gameState.players.find((p: any) => p.id === gameState.currentTurn);
                return currentPlayer ? (
                  <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/30 via-emerald-400/20 to-emerald-500/30 rounded-lg border-2 border-emerald-400/60 flex-shrink-0 shadow-lg shadow-emerald-500/30">
                    <span className="text-lg">💻</span>
                    <span className="text-sm text-emerald-300 font-mono font-bold uppercase tracking-wider">CURRENT TURN</span>
                    <span className="text-base font-extrabold text-white font-mono">{currentPlayer.name}</span>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  </div>
                ) : null;
              })()}
              <div className="relative w-full flex-1 flex flex-col items-center justify-center p-2 min-h-0" style={{ zIndex: 20 }}>
                <PixelBoard
                  boardState={gameState.boardState}
                  players={gameState.players}
                  currentPlayer={currentPlayer}
                  onTileClick={(property) => {
                    setLandedProperty(property);
                  }}
                  landedPosition={landedPosition}
                />

                {!hasEnoughPlayers && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 gap-4 z-30 pointer-events-none">
                    <div className="bg-slate-900/95 backdrop-blur-lg rounded-2xl p-8 border-4 border-emerald-400 shadow-2xl pointer-events-auto">
                      <div className="text-3xl">👥</div>
                      <h2 className="text-2xl font-bold text-white font-mono mt-4">Waiting for more players</h2>
                      <p className="text-white/70 font-mono text-sm mt-2">
                        Share room code <span className="text-emerald-400 font-semibold text-lg">{gameState.roomCode}</span> with a friend
                      </p>
                      <p className="text-white/50 text-xs font-mono mt-2">
                        {playersNeeded === 1 ? 'Need 1 more player to start.' : `Need ${playersNeeded} more players to start.`}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Current Action Display in Center - Only show when there's an action */}
                {(actionType && actionType !== 'awaiting-action') && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="pointer-events-auto" id="board-center">
                      <CurrentActionDisplay
                        actionType={actionType}
                        diceResult={diceResult || undefined}
                        property={landedProperty}
                        owner={propertyOwner}
                        rent={rent}
                        onRollDice={handleRollDice}
                        onSolveAndBuy={() => {
                          if (currentProblem) {
                            setShowChallengeModal(true);
                          }
                        }}
                        onSkip={() => {
                          setActionType(null);
                          setLandedProperty(null);
                        }}
                        onPayRent={handlePayRent}
                        onCodeDuel={handleCodeDuel}
                        onUpgrade={handleUpgrade}
                        onContinue={() => {
                          setActionType(null);
                          setLandedProperty(null);
                        }}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* RECENT EVENTS at Bottom of Board - Compact */}
                {gameEvents.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/70 backdrop-blur-md rounded-lg border border-slate-700/50 p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-emerald-400 text-xs">★</span>
                      <h3 className="text-[10px] font-semibold text-white/70 font-mono uppercase">RECENT</h3>
                    </div>
                    <div className="text-[10px] text-white/50 font-mono truncate">
                      {gameEvents[gameEvents.length - 1].message}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Sidebar - GAME TIMER + YOUR TURN + YOUR STATS */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="col-span-2 flex flex-col gap-2 overflow-hidden relative"
              style={{ maxHeight: 'calc(100vh - 2rem)', zIndex: 10 }}
            >
              {/* GAME TIMER Section - Compact with 25% larger fonts */}
              <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded border border-emerald-500/20 shadow-lg p-2 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono" style={{ fontSize: 'clamp(12.5px, 1.25vmin, 15px)' }}>TIMER</h2>
                  <span className="text-[10px] text-white/50 font-mono" style={{ fontSize: 'clamp(11.25px, 1.125vmin, 13.75px)' }}>T{gameState.turnNumber}</span>
                </div>
                <div className="space-y-2">
                  {/* TURN TIMER */}
                  <div>
                    <h3 className="text-[10px] text-white/50 font-mono mb-1" style={{ fontSize: 'clamp(11.25px, 1.125vmin, 13.75px)' }}>TURN</h3>
                    <TurnTimerDisplay 
                      duration={180}
                      isPaused={!hasEnoughPlayers || gameState.currentTurn !== playerId}
                      turnNumber={gameState.turnNumber}
                    />
                  </div>
                </div>
              </div>
              
              {/* YOUR TURN Section - Clearer CTA */}
              <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded border border-emerald-500/20 shadow-lg p-2 flex-shrink-0">
                {isMyTurn && hasEnoughPlayers ? (
                  <>
                    <h2 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono mb-1.5">YOUR TURN</h2>
                    <button
                      onClick={handleRollDice}
                      className="w-full py-2 px-2 rounded-lg font-mono text-xs font-extrabold transition-all bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white cursor-pointer shadow-lg shadow-emerald-500/50 border-2 border-emerald-300/50"
                      style={{
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="text-base">🎲</span>
                        <span>ROLL DICE</span>
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">WAITING</h2>
                    <div className="w-full py-2 px-2 rounded font-mono text-[10px] font-bold bg-slate-700/50 text-white/50 cursor-not-allowed text-center">
                      Not your turn
                    </div>
                  </>
                )}
              </div>

              {/* YOUR STATS Section - Ultra Compact */}
              {currentPlayer && (
                <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded border border-emerald-500/20 shadow-lg p-2 flex-shrink-0">
                  <h2 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono mb-1.5">STATS</h2>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-white/50 font-mono">$:</span>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">${currentPlayer.money.toLocaleString()}</span>
              </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-white/50 font-mono">Props:</span>
                      <span className="text-[10px] font-bold text-white font-mono">
                        {gameState.boardState.filter((p: any) => p.ownerId === playerId).length}
                      </span>
        </div>
      </div>
            </div>
          )}
            </motion.div>
          </motion.div>
            </div>
        </div>

      {/* Dice Roller removed - now in right sidebar */}

      {/* Particle Effects */}
      <DiceParticles trigger={effects.diceParticles} />
      <ConfettiParticles trigger={effects.confettiParticles} />
      <GoldenRingEffect trigger={effects.goldenRing} />

      {/* Notification Toasts */}
      <NotificationToast 
        notifications={notifications}
        onClose={closeNotification}
      />

      {/* Money Transfer Effects */}
      <MoneyTransferEffect
        transfers={moneyTransfers}
        onComplete={(id) => setMoneyTransfers(transfers => transfers.filter(t => t.id !== id))}
      />

      {/* Floating Money Changes */}
      {floatingChanges.map((change) => (
        <FloatingMoneyChange
          key={change.id}
          amount={change.amount}
          position={change.position}
          onComplete={() => setFloatingChanges(changes => changes.filter(c => c.id !== change.id))}
        />
      ))}

      {/* Property Card Modal */}
      {showPropertyCardModal && landedProperty && (
        <PropertyCardModal
          property={landedProperty}
          owner={landedProperty.ownerId ? gameState?.players.find((p: any) => p.id === landedProperty.ownerId) : null}
          currentPlayerMoney={currentPlayer?.money || 0}
          isOpen={showPropertyCardModal}
          onClose={handlePropertyCardSkip}
          onBuy={handlePropertyCardBuy}
          onSkip={handlePropertyCardSkip}
          onPayRent={actionType === 'landed-opponent' ? handlePayRent : undefined}
        />
      )}

      {/* Code Challenge Modal */}
      {showChallengeModal && currentProblem && landedProperty && (
        <FullCodeChallengeModal
          problem={currentProblem}
          propertyName={landedProperty.name}
          propertyPrice={landedProperty.price}
          onSubmit={handleSolveAndBuy}
          onGiveUp={() => {
            setShowChallengeModal(false);
            setCurrentProblem(null);
            setLandedProperty(null);
            setActionType(null);
            // End turn when player skips buying property
            if (socket && gameState) {
              socket.emit('end-turn', { gameId: gameState._id, playerId });
            }
          }}
          timeLimit={300}
        />
      )}

      {/* Code Duel Modal */}
      {showDuelModal && currentProblem && gameState.activeDuel && (
        <CodeDuelModal
          problem={currentProblem}
          opponent={gameState.players.find((p: any) => 
            p.id === (gameState.activeDuel.challengerId === playerId 
              ? gameState.activeDuel.defenderId 
              : gameState.activeDuel.challengerId)
          )}
          onWin={handleDuelWin}
          onLose={handleDuelLose}
          onCodeUpdate={handleDuelCodeUpdate}
          opponentCode={duelOpponentCode}
          opponentStatus={duelOpponentStatus}
          timeLimit={300}
        />
      )}

      {/* Debugging Card Modal */}
      {debuggingCard && (
        <DebuggingCardModal
          card={debuggingCard}
          onClose={() => {
            setDebuggingCard(null);
            socket?.emit('get-game-state', { gameId });
          }}
        />
      )}

      {/* Game Over Modal */}
      {showGameOver && winner && (
        <GameOverModal
          players={playersWithNetWorth}
          winner={winner ? {
            ...winner,
            netWorth: calculateNetWorth(winner),
          } : undefined}
          onClose={() => navigate('/')}
        />
      )}
    </div>
  );
}
