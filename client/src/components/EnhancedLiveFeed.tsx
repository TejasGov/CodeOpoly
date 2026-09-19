import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface FeedEvent {
  id: string;
  type: 'dice' | 'purchase' | 'rent' | 'land' | 'special' | 'duel' | 'upgrade' | 'bankrupt';
  message: string;
  timestamp: number;
  player?: string;
  playerAvatar?: string;
  amount?: number;
  property?: string;
}

interface EnhancedLiveFeedProps {
  events: FeedEvent[];
  maxEvents?: number;
  currentPlayerId?: string;
}

const EVENT_ICONS = {
  dice: '🎲',
  purchase: '💰',
  rent: '💸',
  land: '🏠',
  special: '⭐',
  duel: '⚔️',
  upgrade: '⬆️',
  bankrupt: '💀',
};

// Enhanced color coding for better visual distinction
const EVENT_COLORS = {
  dice: 'from-cyan-500 to-blue-500',        // Blue for dice rolls
  purchase: 'from-emerald-500 to-green-500', // Green for purchases (money gained)
  rent: 'from-red-500 to-orange-500',        // Red for rent (money lost)
  land: 'from-purple-500 to-pink-500',       // Purple for landing events
  special: 'from-yellow-500 to-orange-500',  // Yellow/Orange for special events
  duel: 'from-red-600 to-pink-600',          // Red/Pink for duels
  upgrade: 'from-teal-500 to-cyan-500',      // Teal for upgrades
  bankrupt: 'from-gray-600 to-gray-800',     // Gray for bankrupt
};

// Get event border color for better visual distinction
const getEventBorderColor = (type: string) => {
  const colors: Record<string, string> = {
    dice: 'border-cyan-400/50',
    purchase: 'border-emerald-400/50',
    rent: 'border-red-400/50',
    land: 'border-purple-400/50',
    special: 'border-yellow-400/50',
    duel: 'border-red-500/50',
    upgrade: 'border-teal-400/50',
    bankrupt: 'border-gray-400/50',
  };
  return colors[type] || 'border-emerald-400/50';
};

type FilterType = 'all' | 'my-turn' | 'transactions';

export default function EnhancedLiveFeed({ events, maxEvents = 20, currentPlayerId }: EnhancedLiveFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Auto-scroll to latest event
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'my-turn') return event.player === currentPlayerId;
    if (filter === 'transactions') return ['purchase', 'rent', 'upgrade'].includes(event.type);
    return true;
  });

  const recentEvents = filteredEvents.slice(-maxEvents);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border-2 border-emerald-500/30 overflow-hidden shadow-xl" style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
      {/* Header with Filter - Cleaner and More Readable */}
      <div className="p-3 sm:p-4 border-b-2 border-emerald-500/30 flex items-center justify-between bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
          <span className="text-white font-black text-sm sm:text-base md:text-lg tracking-wider">LIVE FEED</span>
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          {(['all', 'my-turn', 'transactions'] as FilterType[]).map((f) => (
            <motion.button
              key={f}
              onClick={() => setFilter(f)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'my-turn' ? 'Me' : 'Money'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Events List - Cleaner and More Readable */}
      <div 
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 custom-scrollbar"
        ref={feedRef}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#10B981 #1F2937',
        }}
      >
        {recentEvents.map((event, idx) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -30, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: idx * 0.03, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.02, x: 4 }}
            className={`bg-gradient-to-r ${EVENT_COLORS[event.type]} rounded-lg p-2 border-2 ${getEventBorderColor(event.type)} hover:border-opacity-100 transition-all cursor-pointer shadow-lg`}
            style={{
              background: `linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))`,
              backdropFilter: 'blur(10px)',
              boxShadow: event.type === 'purchase' 
                ? '0 4px 12px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.1)'
                : event.type === 'rent'
                ? '0 4px 12px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.1)'
                : '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm backdrop-blur-sm border border-white/20">
                {EVENT_ICONS[event.type] || '⭐'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                  <span className="text-xs sm:text-sm text-text-muted font-medium">{formatTimestamp(event.timestamp)}</span>
                  {event.amount && (
                    <span className={`text-xs sm:text-sm font-bold ${
                      event.amount > 0 ? 'text-code-green' : 'text-code-red'
                    }`}>
                      {event.amount > 0 ? '+' : ''}${Math.abs(event.amount)}
                    </span>
                  )}
                </div>
                <div className="text-sm sm:text-base text-text-primary break-words font-semibold leading-snug mb-1">{event.message}</div>
                {event.player && (
                  <div className="text-xs sm:text-sm text-text-muted mt-1 flex items-center gap-1.5">
                    <span className="text-base">{event.playerAvatar}</span>
                    <span>{event.player}</span>
                  </div>
                )}
                {event.property && (
                  <div className="text-xs sm:text-sm text-emerald-400 mt-1 font-medium">📍 {event.property}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {recentEvents.length === 0 && (
          <div className="text-center text-text-muted text-sm py-8">
            No events yet...
          </div>
        )}
      </div>
    </div>
  );
}
