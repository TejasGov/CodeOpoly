import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPropertyCard from './AnimatedPropertyCard';
import AnimatedPlayerToken from './AnimatedPlayerToken';
import { soundManager } from '../lib/soundEffects';

interface Property {
  id: string;
  name: string;
  position: number;
  price: number;
  rent: number;
  rentWithHouse?: number[];
  color: string;
  ownerId?: string;
  houses: number;
  isSpecial?: boolean;
  specialType?: 'go' | 'jail' | 'free-parking' | 'go-to-jail' | 'chance' | 'community-chest';
  isRailroad?: boolean;
  isUtility?: boolean;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  position: number;
  money: number;
  properties: string[];
  color?: string;
}

interface EnhancedMonopolyBoardProps {
  boardState: Property[];
  players: Player[];
  currentPlayer: Player | null;
  onTileClick: (property: Property) => void;
  landedPosition?: number;
}

export default function EnhancedMonopolyBoard({
  boardState,
  players,
  currentPlayer,
  onTileClick,
  landedPosition,
}: EnhancedMonopolyBoardProps) {
  const [hoveredProperty, setHoveredProperty] = useState<number | null>(null);
  const [glowingTile, setGlowingTile] = useState<number | null>(landedPosition || null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (landedPosition !== undefined) {
      setGlowingTile(landedPosition);
      setTimeout(() => setGlowingTile(null), 3000);
    }
  }, [landedPosition]);

  const getSpaceAtPosition = (pos: number) => {
    return boardState.find(p => p.position === pos);
  };

  const getPlayersOnSpace = (pos: number) => {
    return players.filter(p => p.position === pos);
  };

  const getPropertyStyle = (property: Property | undefined, pos: number) => {
    if (!property) return {};
    
    const isHovered = hoveredProperty === pos;
    const isGlowing = glowingTile === pos;
    const isOwned = !!property.ownerId;
    const owner = players.find(p => p.id === property.ownerId);
    
    // Extract RGB from hex color for CSS variable
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '79, 209, 197';
    };
    const propertyColorRgb = hexToRgb(property.color);
    
    return {
      background: property.isSpecial 
        ? `linear-gradient(135deg, ${property.color}40, ${property.color}60)`
        : isOwned
        ? `linear-gradient(135deg, rgba(20, 30, 50, 0.6), rgba(20, 30, 50, 0.7))` // Dimmer for owned properties
        : `linear-gradient(135deg, rgba(20, 30, 50, 0.9), rgba(20, 30, 50, 0.95))`, // Brighter for unowned
      border: isOwned && owner
        ? `3px solid ${owner.color || '#FFD700'}`
        : `2px solid rgba(255, 255, 255, 0.2)`, // More visible border for unowned
      opacity: isOwned && !isHovered ? 0.7 : 1, // Dim owned properties when not hovered
      boxShadow: isGlowing
        ? `0 0 30px ${property.color}, 0 0 60px ${property.color}80, 0 0 90px ${property.color}60, inset 0 0 30px ${property.color}40, 0 12px 32px rgba(0,0,0,0.7), 0 0 40px rgba(${propertyColorRgb}, 0.8)`
        : isHovered
        ? `0 12px 32px rgba(0,0,0,0.7), 0 0 40px rgba(${propertyColorRgb}, 0.8), inset 0 1px 2px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.5)`
        : isOwned
        ? `0 2px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.05), 0 0 10px rgba(${propertyColorRgb}, 0.2)` // Subtle shadow for owned
        : `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1), 0 0 20px rgba(${propertyColorRgb}, 0.4)`, // More prominent for unowned
      // Prevent hover scale/translate from breaking grid alignment
      transform: isHovered 
        ? 'perspective(1000px) rotateX(0deg)' 
        : 'perspective(1000px) rotateX(0deg)',
      zIndex: isHovered ? 100 : isGlowing ? 10 : 1,
      transition: 'box-shadow 0.25s ease, opacity 0.25s ease, z-index 0.25s ease',
      '--property-color': property.color,
    } as React.CSSProperties;
  };

  const renderCornerSpace = (property: Property | undefined, className: string, icon: string) => {
    const playersHere = property ? getPlayersOnSpace(property.position) : [];
    const isGlowing = property && glowingTile === property.position;
    const isHovered = property && hoveredProperty === property.position;
    const specialType = property?.specialType;
    
    // Corner spaces: Simplified design with icon focus
    return (
      <div 
        className={`w-40 h-40 relative ${className}`}
        onMouseEnter={() => property && setHoveredProperty(property.position)}
        onMouseLeave={() => property && setHoveredProperty(null)}
      >
        <motion.div
          animate={isGlowing ? { 
            scale: [1, 1.1, 1],
          } : isHovered ? {
            scale: 1.05,
          } : {}}
          transition={{ duration: 0.5 }}
          className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden group hover:border-cyan-300 transition-all border-2"
          style={{
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.3), inset 0 0 15px rgba(6, 182, 212, 0.1)',
          }}
        >
          <div className="text-center z-10">
            {/* Simplified - Icon only for most corners */}
            {specialType === 'free-parking' && (
              <motion.div
                className="text-6xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, ease: 'easeInOut' }}
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(66, 153, 225, 0.6))',
                }}
              >
                🅿️
              </motion.div>
            )}
            
            {specialType === 'go-to-jail' && (
              <motion.div
                className="text-6xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.6))',
                }}
              >
                🚨
              </motion.div>
            )}
            
            {specialType === 'jail' && (
              <motion.div
                className="text-6xl"
                animate={{
                  rotate: [0, -5, 5, 0],
                }}
                transition={{ duration: 5, ease: 'easeInOut', times: [0, 0.02, 0.04, 0.1] }}
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.8))',
                }}
              >
                🔒
              </motion.div>
            )}
            
            {specialType === 'go' && (
              <>
                <motion.div
                  className="text-6xl mb-1"
                  animate={{ x: [-4, 4, -4] }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                >
                  ➡️
                </motion.div>
                <div
                  className="text-xl font-black text-yellow-200"
                  style={{
                    textShadow: '0 2px 6px rgba(0, 0, 0, 1), 0 0 16px rgba(251, 191, 36, 0.8)',
                    fontSize: 'clamp(16px, 2vmin, 24px)', // 25% increase
                  }}
                >
                  $200
                </div>
              </>
            )}
            
            {/* Default icon if no special type */}
            {!specialType && (
              <motion.div
                className="text-6xl"
                animate={isGlowing ? { 
                  scale: [1, 1.3, 1],
                  rotate: [0, 360],
                } : {}}
                transition={{ duration: 2 }}
              >
                {icon}
              </motion.div>
            )}
            
            {/* Simplified property name - only if needed */}
            {property && property.name && !specialType && (
              <div 
                className="text-white font-extrabold mt-1 text-center px-1"
                style={{
                  fontSize: 'clamp(14px, 1.8vmin, 20px)', // Smaller for corners
                  textShadow: '0 1px 4px rgba(0, 0, 0, 1)',
                }}
              >
                {property.name}
              </div>
            )}
            
            {/* Players - simplified */}
            {playersHere.length > 0 && (
              <div className="absolute bottom-1 right-1 flex gap-0.5">
                {playersHere.map(p => (
                  <div key={p.id} className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border border-white/50">
                    {p.avatar}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderProperty = (property: Property, orientation: 'horizontal' | 'vertical', isTop: boolean = false) => {
    const playersHere = getPlayersOnSpace(property.position);
    const isOwned = !!property.ownerId;
    const owner = players.find(p => p.id === property.ownerId);
    const isHovered = hoveredProperty === property.position;
    
    // Handle special spaces (Chance/Bug Card, Community Chest/PR Card) - Enhanced Thematic Design
    if (property.isSpecial && (property.specialType === 'chance' || property.specialType === 'community-chest')) {
      const isBugCard = property.specialType === 'chance';
      const isPRCard = property.specialType === 'community-chest';
      
      return (
        <motion.div
          key={property.id}
          className={`w-24 h-32 rounded-lg flex flex-col items-center justify-center transition-all group cursor-pointer border-3 ${
            isBugCard
              ? 'bg-gradient-to-br from-red-900/90 via-red-800/95 to-red-900/90 border-red-400 hover:border-red-300'
              : 'bg-gradient-to-br from-emerald-900/90 via-green-800/95 to-emerald-900/90 border-emerald-400 hover:border-emerald-300'
          }`}
          style={{
            border: `3px solid ${isBugCard ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)'}`,
            boxShadow: isBugCard
              ? '0 0 20px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(239, 68, 68, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.3)'
              : '0 0 20px rgba(16, 185, 129, 0.6), inset 0 0 20px rgba(16, 185, 129, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.3)',
          }}
          onMouseEnter={() => {
            setHoveredProperty(property.position);
            soundManager.playPropertyLanding();
          }}
          onMouseLeave={() => setHoveredProperty(null)}
          onClick={() => onTileClick(property)}
          whileHover={{ scale: 1.05 }}
        >
          {/* Terminal/Error style for Bug Card - Icon only */}
          {isBugCard && (
            <motion.div
              className="text-6xl"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              style={{
                filter: 'drop-shadow(0 4px 16px rgba(239, 68, 68, 1))',
              }}
            >
              ⚡
            </motion.div>
          )}
          
          {/* Success style for PR Card - Icon only */}
          {isPRCard && (
            <motion.div
              className="text-6xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                filter: 'drop-shadow(0 4px 16px rgba(16, 185, 129, 1))',
              }}
            >
              📦
            </motion.div>
          )}
        </motion.div>
      );
    }
    
    // CRITICAL FIX: Standard card sizes per design spec
    // Regular properties: 112px x 144px (w-28 h-36)
    const cardSize = orientation === 'horizontal' 
      ? 'h-36 min-h-[144px] w-28 min-w-[112px]' // 112px x 144px per spec
      : 'h-full min-h-[144px] w-28 min-w-[112px]'; // 112px width, full height
    
    return (
      <motion.div
        key={property.id}
        className={`cursor-pointer relative ${cardSize} bg-gray-800 rounded-lg overflow-hidden`}
        style={{
          ...getPropertyStyle(property, property.position),
          border: `2px solid rgba(255, 255, 255, 0.6)`, // 2px white border for better definition
          // Removed rotation to keep text readable
        }}
        onMouseEnter={() => {
          setHoveredProperty(property.position);
        }}
        onMouseLeave={() => setHoveredProperty(null)}
        onClick={() => onTileClick(property)}
      >
        {/* Enhanced Hover Tooltip - Property Info with Thematic Description */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 backdrop-blur-lg rounded-xl p-4 border-2 border-emerald-400 shadow-2xl min-w-[250px] max-w-[300px]"
              style={{
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.5), inset 0 0 20px rgba(16, 185, 129, 0.1)',
              }}
            >
              {/* Property Name with Color Indicator */}
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: property.color }}
                />
                <div className="text-base font-bold text-white font-mono">{property.name}</div>
              </div>
              
              {/* Thematic Description */}
              <div className="text-xs text-emerald-300/90 mb-3 leading-relaxed italic border-l-2 border-emerald-400/50 pl-3">
                {property.isSpecial 
                  ? (property.specialType === 'chance' 
                      ? '⚡ Bug Card - Unexpected errors and debugging challenges await! Draw a card to face coding bugs.'
                      : property.specialType === 'community-chest'
                      ? '📦 PR Card - Code review and merge opportunities. Draw a card for potential bonuses or challenges.'
                      : property.name === 'GO'
                      ? '🚀 Start your coding journey! Collect $200 when you pass. Begin your path to tech dominance.'
                      : property.name)
                  : `${property.name} - A valuable coding property in the tech ecosystem. Own it to collect rent from other developers.`}
              </div>
              
              {!property.isSpecial && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Price:</span>
                    <span className="text-yellow-300 font-mono font-bold text-sm">💰 ${property.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rent:</span>
                    <span className="text-emerald-300 font-mono font-bold text-sm">📊 ${property.rent}</span>
                  </div>
                  {isOwned && owner && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Owner:</span>
                      <span className="text-white font-semibold flex items-center gap-1">
                        <span>{owner.avatar}</span>
                        <span>{owner.name}</span>
                      </span>
                    </div>
                  )}
                  {property.houses > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Houses:</span>
                      <span className="text-green-300 font-mono">{'🏠'.repeat(Math.min(property.houses, 4))} {property.houses === 5 ? '🏨' : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
        {/* Animated border glow on hover */}
        {hoveredProperty === property.position && (
          <motion.div
            className="absolute inset-[-2px] rounded pointer-events-none"
            style={{
              background: `linear-gradient(45deg, ${property.color}, transparent, ${property.color})`,
              backgroundSize: '200% 200%',
              opacity: 0,
              zIndex: -1,
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              backgroundPosition: ['0% 50%', '200% 50%', '0% 50%'],
            }}
            transition={{
              opacity: { duration: 0.3 },
              backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
            }}
          />
        )}
        
        {/* Color Stripe - Optimized height */}
        <div
          className="h-8 w-full absolute top-0 left-0 z-10"
          style={{
            backgroundColor: property.color,
            boxShadow: `0 2px 8px ${property.color}80`,
          }}
        />
        
        <AnimatedPropertyCard
          property={property}
          owner={owner}
          isHovered={hoveredProperty === property.position}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
          className="w-full h-full"
          orientation={orientation}
        />
        
        {/* Simple Ownership indicator */}
        {isOwned && owner && (
          <div
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-emerald-500 border-2 border-white"
          >
            {owner.name[0]}
          </div>
        )}
        
        {/* Enhanced Houses/Hotels */}
        {property.houses > 0 && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
            {[...Array(Math.min(property.houses, 4))].map((_, i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-sm relative"
                style={{
                  background: 'linear-gradient(135deg, #68D391 0%, #48BB78 100%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                  transform: 'perspective(100px) rotateX(-20deg)',
                }}
                initial={{ scale: 0, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 500 }}
              >
                {/* House roof */}
                <div
                  className="absolute -top-1 left-1/2 transform -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '3px solid transparent',
                    borderRight: '3px solid transparent',
                    borderBottom: '3px solid #68D391',
                  }}
                />
              </motion.div>
            ))}
            {property.houses === 5 && (
              <motion.div
                className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #FC8181 0%, #F56565 100%)',
                  boxShadow: '0 2px 8px rgba(252, 129, 129, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
                  transform: 'perspective(100px) rotateX(-20deg)',
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                H
              </motion.div>
            )}
          </div>
        )}

        {/* Player Tokens */}
        {playersHere.length > 0 && (
          <div className="absolute bottom-1 right-1 flex gap-1 flex-wrap max-w-[60%]">
            {playersHere.map((p, idx) => (
              <AnimatedPlayerToken
                key={p.id}
                player={p}
                isCurrentTurn={currentPlayer?.id === p.id}
                isMoving={false}
              />
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // Standard Monopoly layout: 40 spaces (0-39)
  // Bottom: 0, 1-9, 10 (GO to Jail) - displayed right to left (9 to 1)
  // Right: 11-19, 20 (Free Parking) - displayed bottom to top
  // Top: 21-29, 30 (Go to Jail) - displayed left to right
  // Left: 31-39, back to 0 (GO) - displayed top to bottom (39 to 31)
  
  const bottomSpaces = [9, 8, 7, 6, 5, 4, 3, 2, 1].map(pos => getSpaceAtPosition(pos));
  const rightSpaces = [11, 12, 13, 14, 15, 16, 17, 18, 19].map(pos => getSpaceAtPosition(pos));
  const topSpaces = [21, 22, 23, 24, 25, 26, 27, 28, 29].map(pos => getSpaceAtPosition(pos));
  const leftSpaces = [31, 32, 33, 34, 35, 36, 37, 38, 39].map(pos => getSpaceAtPosition(pos)); // Bottom to top for left (after rotation)

  return (
    <motion.div 
      ref={boardRef}
      className="w-full mx-auto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
          backgroundSize: '400% 400%',
          opacity: 0.3,
          filter: 'blur(40px)',
        }}
      />
      
      <div 
        className="relative rounded-2xl overflow-visible game-board board-border bg-gradient-to-br from-gray-800 via-slate-800 to-gray-800 border-4 border-cyan-500 shadow-2xl shadow-cyan-500/20"
        style={{
          position: 'relative',
          padding: '1.5vmin',
          minHeight: 'fit-content',
          width: 'min(95vh, 95vw, 2000px)',
          height: 'min(95vh, 95vw, 2000px)',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Animated gradient orbs in background */}
        <motion.div
          className="absolute bg-orb orb-1"
          style={{
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #4FD1C5 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.3,
            top: '-200px',
            left: '-200px',
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bg-orb orb-2"
          style={{
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #68D391 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.3,
            bottom: '-250px',
            right: '-250px',
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, 30, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 5,
          }}
        />
        <motion.div
          className="absolute bg-orb orb-3"
          style={{
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #B794F4 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.3,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 10,
          }}
        />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 board-grid pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(79, 209, 197, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(79, 209, 197, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            opacity: 0.3,
          }}
        />
        
        {/* Vignette effect */}
        <div 
          className="absolute inset-0 board-vignette pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
          }}
        />
        
        {/* Noise texture for depth */}
        <div 
          className="absolute inset-0 board-noise pointer-events-none opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: '4px solid transparent',
            borderImage: 'linear-gradient(135deg, #4FD1C5 0%, #38B2AC 25%, #68D391 50%, #4FD1C5 75%, #38B2AC 100%) 1',
          }}
          animate={{
            boxShadow: [
              '0 0 40px rgba(79, 209, 197, 0.3), inset 0 0 40px rgba(79, 209, 197, 0.1)',
              '0 0 60px rgba(79, 209, 197, 0.5), inset 0 0 60px rgba(79, 209, 197, 0.2)',
              '0 0 40px rgba(79, 209, 197, 0.3), inset 0 0 40px rgba(79, 209, 197, 0.1)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Responsive Square Board - MAXIMUM POSSIBLE SIZE */}
        <div 
          className="relative codeopoly-board-container"
          style={{
            width: 'min(95vh, 95vw, 2000px)',
            height: 'min(95vh, 95vw, 2000px)',
            aspectRatio: '1 / 1',
            margin: '0 auto',
            overflow: 'visible',
            padding: '1.5vmin',
          }}
        >
      {/* Board Grid Container - Perfect 11x11 Square Grid - Enlarged */}
      <div 
        className="relative codeopoly-board-grid"
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(11, 1fr)',
          gridTemplateRows: 'repeat(11, 1fr)',
          gap: '10px', // Optimized spacing between cards
        }}
      >
        {/* Top-Left Corner: Free Parking (20) */}
        <div style={{ gridArea: '1 / 1 / 2 / 2' }}>
          {renderCornerSpace(getSpaceAtPosition(20), 'h-full w-full', '🅿️')}
        </div>
        
        {/* Top Row: Properties (21-29) */}
        {topSpaces.map((prop, idx) => prop && (
          <div key={prop.id} style={{ gridArea: `1 / ${idx + 2} / 2 / ${idx + 3}` }}>
            {renderProperty(prop, 'horizontal', true)}
          </div>
        ))}
        
        {/* Top-Right Corner: Go to Jail (30) */}
        <div style={{ gridArea: '1 / 11 / 2 / 12' }}>
          {renderCornerSpace(getSpaceAtPosition(30), 'h-full w-full', '🚨')}
        </div>

        {/* Left Column: Properties (39 down to 31) */}
        {leftSpaces.map((prop, idx) => prop && (
          <div key={prop.id} style={{ gridArea: `${idx + 2} / 1 / ${idx + 3} / 2` }}>
            {renderProperty(prop, 'vertical')}
          </div>
        ))}
          
            {/* Center Area - Minimal watermark (very subtle) */}
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                gridArea: '6 / 6 / 7 / 7',
              }}
            >
              <div className="text-center opacity-20">
                <div className="text-xs font-mono text-emerald-400/30 font-bold">
                  CODEOPOLY
                </div>
              </div>
            </div>

        {/* Right Column: Properties (11-19) */}
        {rightSpaces.map((prop, idx) => prop && (
          <div key={prop.id} style={{ gridArea: `${idx + 2} / 11 / ${idx + 3} / 12` }}>
            {renderProperty(prop, 'vertical')}
          </div>
        ))}

        {/* Bottom-Left Corner: Jail (10) */}
        <div style={{ gridArea: '11 / 1 / 12 / 2' }}>
          {renderCornerSpace(getSpaceAtPosition(10), 'h-full w-full', '🔒')}
        </div>
        
        {/* Bottom Row: Properties (9 down to 1) */}
        {bottomSpaces.map((prop, idx) => prop && (
          <div key={prop.id} style={{ gridArea: `11 / ${idx + 2} / 12 / ${idx + 3}` }}>
            {renderProperty(prop, 'horizontal')}
          </div>
        ))}
        
        {/* Bottom-Right Corner: GO (0) */}
        <div style={{ gridArea: '11 / 11 / 12 / 12' }}>
          {renderCornerSpace(getSpaceAtPosition(0), 'h-full w-full', '➡️')}
        </div>
      </div>
        </div>
      </div>
    </motion.div>
  );
}
