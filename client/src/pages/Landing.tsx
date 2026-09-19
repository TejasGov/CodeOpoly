import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/session';

const AVATAR_TILES = ['</>', '{}', '#!', '()', '[]', '::'];

export default function Landing() {
  const navigate = useNavigate();
  const session = getSession();

  const start = () => navigate(session ? '/lobby' : '/login');

  return (
    <div className="px-theme" style={styles.root}>
      {/* subtle scanline / grid texture */}
      <div style={styles.grid} />

      <div style={styles.frames}>
        {/* LEFT FRAME — brand / preview */}
        <div className="px-panel-dark" style={styles.leftFrame}>
          <div style={styles.logoRow}>
            <span className="px-qblock">?</span>
            <h1 className="px-head" style={styles.logo}>
              <span style={{ color: '#e63946' }}>CODE</span>
              <span style={{ color: '#f7f2e0' }}>POLY</span>
            </h1>
          </div>

          <p className="px-body" style={styles.tagline}>
            Competitive coding, one dice roll at a time.
          </p>

          {/* mini pixel board preview */}
          <div style={styles.previewGrid}>
            {AVATAR_TILES.map((t, i) => (
              <div
                key={i}
                className="px-head"
                style={{ ...styles.previewTile, background: TILE_COLORS[i % TILE_COLORS.length] }}
              >
                {t}
              </div>
            ))}
          </div>

          <ul className="px-body" style={styles.bullets}>
            <li>▸ Roll, land, solve to buy</li>
            <li>▸ Duel rivals in code battles</li>
            <li>▸ Own the board, win the world</li>
          </ul>
        </div>

        {/* RIGHT FRAME — call to action */}
        <div className="px-panel" style={styles.rightFrame}>
          <h2 className="px-head" style={styles.ctaTitle}>PRESS START</h2>
          <p className="px-body" style={styles.ctaSub}>World 1 · Python Village awaits.</p>

          <button className="px-btn" style={styles.playBtn} onClick={start}>
            ▶ PLAY
          </button>

          <button className="px-btn px-btn-dark" style={styles.secondaryBtn} onClick={() => navigate('/login')}>
            {session ? 'SWITCH PLAYER' : 'LOG IN'}
          </button>

          {session && (
            <div className="px-body" style={styles.welcomeBack}>
              Welcome back, <strong>{session.username}</strong> · {session.wins}W / {session.losses}L
            </div>
          )}

          <div className="px-body" style={styles.footNote}>© CODEPOLY · a coding board game</div>
        </div>
      </div>
    </div>
  );
}

const TILE_COLORS = ['#4caf50', '#ffd23f', '#e08a2e', '#9b5de5', '#ef4444', '#7ec8ff'];

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    width: '100%',
    background: '#050509',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'auto',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
    pointerEvents: 'none',
  },
  frames: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 0.85fr)',
    gap: '24px',
    width: '100%',
    maxWidth: '900px',
  },
  leftFrame: { padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  logo: { fontSize: '1.6rem', margin: 0 },
  tagline: { color: '#c9c4e0', margin: 0, fontSize: '1.35rem' },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '4px',
  },
  previewTile: {
    aspectRatio: '1 / 1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1a1a2e',
    fontSize: '0.8rem',
    border: '3px solid #1a1a2e',
    boxShadow: 'inset -3px -3px 0 0 rgba(0,0,0,0.25), inset 3px 3px 0 0 rgba(255,255,255,0.35)',
  },
  bullets: { listStyle: 'none', padding: 0, margin: 0, color: '#e9e5ff', display: 'grid', gap: '6px', fontSize: '1.25rem' },
  rightFrame: { padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' },
  ctaTitle: { fontSize: '1.15rem', margin: 0, color: '#1a1a2e' },
  ctaSub: { margin: 0, color: '#4a4636', fontSize: '1.25rem' },
  playBtn: { fontSize: '1.1rem', padding: '16px', marginTop: '8px' },
  secondaryBtn: { fontSize: '0.7rem' },
  welcomeBack: { color: '#4a4636', fontSize: '1.15rem', marginTop: '4px' },
  footNote: { color: '#8a8266', fontSize: '1rem', marginTop: 'auto' },
};
