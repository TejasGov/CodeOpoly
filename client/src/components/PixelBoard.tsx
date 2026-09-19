interface Property {
  id: string;
  name: string;
  position: number;
  price: number;
  rent: number;
  color: string;
  category?: string;
  ownerId?: string;
  houses: number;
  isSpecial?: boolean;
  specialType?: string;
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

interface PixelBoardProps {
  boardState: Property[];
  players: Player[];
  currentPlayer: Player | null;
  onTileClick: (property: Property) => void;
  landedPosition?: number;
}

// Category -> pixel icon + label (Figma-style)
const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  frontend: { icon: '</>', label: 'CODE' },
  backend: { icon: '{ }', label: 'CODE' },
  cloud: { icon: '☁', label: 'CLOUD' },
  devops: { icon: '⚙', label: 'DEBUG' },
  database: { icon: '▤', label: 'DATA' },
  mobile: { icon: '▢', label: 'LOGIC' },
  'ai-ml': { icon: '✦', label: 'BONUS' },
  security: { icon: '🔒', label: 'BATTLE' },
  railroad: { icon: '🚆', label: 'NET' },
  utility: { icon: '⚡', label: 'POWER' },
};

const SPECIAL_META: Record<string, { icon: string; label: string; bg: string; fg?: string }> = {
  go: { icon: '▶', label: 'START', bg: '#2ecc71' },
  chance: { icon: '?', label: 'QUIZ', bg: '#ffd23f', fg: '#1a1a2e' },
  'community-chest': { icon: '★', label: 'BONUS', bg: '#9b5de5' },
  jail: { icon: '🐛', label: 'DEBUG', bg: '#e08a2e' },
  'go-to-jail': { icon: '👑', label: 'BOWSER', bg: '#201a2e' },
  'free-parking': { icon: '◆', label: 'LOGIC', bg: '#ffcf33', fg: '#1a1a2e' },
  tax: { icon: '✕', label: 'BATTLE', bg: '#ef4444' },
};

export default function PixelBoard({ boardState, players, currentPlayer, onTileClick, landedPosition }: PixelBoardProps) {
  const at = (pos: number) => boardState.find((p) => p.position === pos);
  const playersAt = (pos: number) => players.filter((p) => p.position === pos);

  const bottom = [9, 8, 7, 6, 5, 4, 3, 2, 1].map(at);
  const right = [11, 12, 13, 14, 15, 16, 17, 18, 19].map(at);
  const top = [21, 22, 23, 24, 25, 26, 27, 28, 29].map(at);
  const left = [31, 32, 33, 34, 35, 36, 37, 38, 39].map(at);

  const Tokens = ({ pos }: { pos: number }) => {
    const here = playersAt(pos);
    if (!here.length) return null;
    return (
      <div style={s.tokens}>
        {here.map((p) => (
          <div
            key={p.id}
            title={p.name}
            style={{
              ...s.token,
              outline: currentPlayer?.id === p.id ? '2px solid #fff' : 'none',
            }}
          >
            {p.avatar}
          </div>
        ))}
      </div>
    );
  };

  const Tile = ({ prop }: { prop?: Property }) => {
    if (!prop) return <div style={s.tileEmpty} />;
    const landed = landedPosition === prop.position;
    const owner = prop.ownerId ? players.find((p) => p.id === prop.ownerId) : null;

    let icon = '•';
    let label = '';
    let bg = prop.color || '#8a8a8a';
    let fg = '#fff';

    if (prop.isSpecial && prop.specialType && SPECIAL_META[prop.specialType]) {
      const m = SPECIAL_META[prop.specialType];
      icon = m.icon;
      label = m.label;
      bg = m.bg;
      fg = m.fg || '#fff';
    } else {
      const m = (prop.category && CATEGORY_META[prop.category]) || { icon: '</>', label: 'CODE' };
      icon = m.icon;
      label = m.label;
      // Keep monopoly color group as the header band; body stays light for readability
    }

    const isColorGroup = !prop.isSpecial;

    return (
      <button
        onClick={() => onTileClick(prop)}
        title={prop.name}
        style={{
          ...s.tile,
          background: isColorGroup ? '#f7f2e0' : bg,
          color: isColorGroup ? '#1a1a2e' : fg,
          boxShadow: landed
            ? '0 0 0 3px #ffd23f, 0 0 14px 4px rgba(255,210,63,0.9), inset -3px -3px 0 0 rgba(0,0,0,0.18), inset 3px 3px 0 0 rgba(255,255,255,0.4)'
            : s.tile.boxShadow,
          borderColor: owner ? (owner.color || '#1a1a2e') : '#1a1a2e',
        }}
      >
        {isColorGroup && <div style={{ ...s.band, background: prop.color }} />}
        <div style={s.icon}>{icon}</div>
        <div style={s.label} className="px-head">{label}</div>
        {!prop.isSpecial && prop.price > 0 && (
          <div style={s.price} className="px-body">${prop.price}</div>
        )}
        {owner && <div style={{ ...s.ownerDot, background: owner.color || '#1a1a2e' }}>{owner.name[0]}</div>}
        {prop.houses > 0 && (
          <div style={s.houses}>{prop.houses >= 5 ? '🏨' : '🏠'.repeat(Math.min(prop.houses, 4))}</div>
        )}
        <Tokens pos={prop.position} />
      </button>
    );
  };

  return (
    <div style={s.frame} className="px-crisp">
      {/* header bar */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span className="px-qblock" style={{ width: 30, height: 30 }}>?</span>
          <span className="px-head" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#e63946' }}>CODE</span>
            <span style={{ color: '#1a1a2e' }}>POLY</span>
          </span>
        </div>
        <div className="px-head" style={s.headerCenter}>PYTHON VILLAGE</div>
        <div className="px-body" style={s.headerRight}>WORLD 1</div>
      </div>

      <div style={s.grid}>
        {/* corners */}
        <div style={{ gridArea: '1 / 1 / 2 / 2' }}><Tile prop={at(20)} /></div>
        {top.map((p, i) => (
          <div key={p?.id || `t${i}`} style={{ gridArea: `1 / ${i + 2} / 2 / ${i + 3}` }}><Tile prop={p} /></div>
        ))}
        <div style={{ gridArea: '1 / 11 / 2 / 12' }}><Tile prop={at(30)} /></div>

        {left.map((p, i) => (
          <div key={p?.id || `l${i}`} style={{ gridArea: `${i + 2} / 1 / ${i + 3} / 2` }}><Tile prop={p} /></div>
        ))}

        {/* center */}
        <div style={s.center}>
          <div className="px-head" style={s.centerLogo}>
            <span style={{ color: '#e63946' }}>CODE</span>
            <span style={{ color: '#f7f2e0' }}>POLY</span>
          </div>
          <div className="px-body" style={s.centerSub}>Roll to play ▸</div>
        </div>

        {right.map((p, i) => (
          <div key={p?.id || `r${i}`} style={{ gridArea: `${i + 2} / 11 / ${i + 3} / 12` }}><Tile prop={p} /></div>
        ))}

        <div style={{ gridArea: '11 / 1 / 12 / 2' }}><Tile prop={at(10)} /></div>
        {bottom.map((p, i) => (
          <div key={p?.id || `b${i}`} style={{ gridArea: `11 / ${i + 2} / 12 / ${i + 3}` }}><Tile prop={p} /></div>
        ))}
        <div style={{ gridArea: '11 / 11 / 12 / 12' }}><Tile prop={at(0)} /></div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  frame: {
    width: 'min(78vh, 100%, 820px)',
    background: '#f7f2e0',
    border: '5px solid #1a1a2e',
    boxShadow: '0 8px 0 0 rgba(0,0,0,0.35), inset -5px -5px 0 0 #e6dcc0, inset 5px 5px 0 0 #fffdf5',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fffdf5',
    border: '4px solid #1a1a2e',
    padding: '6px 12px',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerCenter: { fontSize: '0.72rem', color: '#1a1a2e' },
  headerRight: { fontSize: '1.1rem', color: '#5a553f' },
  grid: {
    width: '100%',
    aspectRatio: '1 / 1',
    display: 'grid',
    gridTemplateColumns: 'repeat(11, 1fr)',
    gridTemplateRows: 'repeat(11, 1fr)',
    gap: '4px',
  },
  tileEmpty: { width: '100%', height: '100%' },
  tile: {
    position: 'relative',
    width: '100%',
    height: '100%',
    border: '3px solid #1a1a2e',
    padding: '2px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    overflow: 'hidden',
    boxShadow: 'inset -3px -3px 0 0 rgba(0,0,0,0.18), inset 3px 3px 0 0 rgba(255,255,255,0.4)',
    fontFamily: 'inherit',
  },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: '18%' },
  icon: { fontSize: 'clamp(10px, 1.8vmin, 20px)', lineHeight: 1, marginTop: '10%' },
  label: { fontSize: 'clamp(4px, 0.9vmin, 8px)', letterSpacing: 0 },
  price: { fontSize: 'clamp(9px, 1.4vmin, 15px)', lineHeight: 1 },
  ownerDot: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
    fontFamily: 'monospace',
  },
  houses: { position: 'absolute', bottom: '2px', left: '2px', fontSize: '8px' },
  tokens: { position: 'absolute', bottom: '1px', right: '1px', display: 'flex', gap: '1px', flexWrap: 'wrap', maxWidth: '70%', justifyContent: 'flex-end' },
  token: {
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    border: '1px solid #fff',
  },
  center: {
    gridArea: '3 / 3 / 10 / 10',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: 'linear-gradient(180deg, #5c94fc 0%, #6ba6ff 100%)',
    border: '4px solid #1a1a2e',
    boxShadow: 'inset -4px -4px 0 0 rgba(0,0,0,0.2), inset 4px 4px 0 0 rgba(255,255,255,0.25)',
  },
  centerLogo: { fontSize: 'clamp(14px, 3vmin, 34px)' },
  centerSub: { color: '#fffdf5', fontSize: 'clamp(12px, 2vmin, 20px)' },
};
