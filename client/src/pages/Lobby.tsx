import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { getApiUrl, getSession, clearSession, refreshProfile, type PlayerProfile } from '../lib/session';

type Mode = 'menu' | 'create' | 'join' | 'stats';

export default function Lobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Load profile and check URL join parameters
  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate('/login');
      return;
    }
    setProfile(s);

    // Refresh live lifetime stats from backend
    refreshProfile(s.username).then((fresh) => {
      if (fresh) setProfile(fresh);
    });

    // Check URL join parameter (e.g. ?join=K9X2B7 or ?code=K9X2B7)
    const joinCode = searchParams.get('join') || searchParams.get('code');
    if (joinCode) {
      setRoomCode(joinCode.trim().toUpperCase());
      setMode('join');
    }
  }, [navigate, searchParams]);

  if (!profile) return null;

  const createGame = async () => {
    setBusy(true);
    setError('');
    const apiUrl = getApiUrl();
    try {
      const res = await axios.post(`${apiUrl}/games/create`, {
        playerName: profile.username,
        avatar: profile.avatar,
      });
      const { gameId, roomCode: code, playerId } = res.data;
      if (gameId && playerId) {
        sessionStorage.setItem(`codepoly.player.${gameId}`, playerId);
        sessionStorage.setItem(`codepoly.room.${gameId}`, code);
      }
      navigate(`/game/${gameId}`, { state: { roomCode: code, playerId, playerName: profile.username } });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create game. Check server connection.');
    } finally {
      setBusy(false);
    }
  };

  const joinGame = async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length < 6) {
      setError('Enter a valid 6-character room code.');
      return;
    }
    setBusy(true);
    setError('');
    const apiUrl = getApiUrl();
    try {
      const res = await axios.post(`${apiUrl}/games/join`, {
        roomCode: code,
        playerName: profile.username,
        avatar: profile.avatar,
      });
      const { gameId, playerId } = res.data;
      if (gameId && playerId) {
        sessionStorage.setItem(`codepoly.player.${gameId}`, playerId);
        sessionStorage.setItem(`codepoly.room.${gameId}`, code);
      }
      navigate(`/game/${gameId}`, { state: { roomCode: code, playerId, playerName: profile.username } });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not join that room. Please check the code.');
    } finally {
      setBusy(false);
    }
  };

  const winRate = profile.gamesPlayed > 0 
    ? Math.round((profile.wins / profile.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="px-theme px-sky-bg" style={styles.root}>
      <div className="px-cloud" style={{ top: '12%', left: 0, animationDuration: '48s' }} />
      <div className="px-cloud" style={{ top: '26%', left: 0, animationDuration: '70s', animationDelay: '-20s' }} />
      <div className="px-cloud" style={{ top: '8%', left: 0, animationDuration: '90s', animationDelay: '-50s' }} />

      {/* Top Bar */}
      <div className="px-panel" style={styles.topbar}>
        <div style={styles.brand} onClick={() => setMode('menu')} className="cursor-pointer">
          <span className="px-qblock" style={{ width: 32, height: 32 }}>?</span>
          <span className="px-head" style={{ fontSize: '1rem' }}>
            <span style={{ color: '#e63946' }}>CODE</span>
            <span style={{ color: '#1a1a2e' }}>POLY</span>
          </span>
        </div>
        <div style={styles.playerChip}>
          <span style={{ fontSize: '1.2rem' }}>{profile.avatar}</span>
          <span className="px-head" style={{ fontSize: '0.7rem' }}>{profile.username}</span>
          <button
            className="px-btn px-btn-yellow"
            style={{ fontSize: '0.55rem', padding: '6px 10px' }}
            onClick={() => setMode(mode === 'stats' ? 'menu' : 'stats')}
          >
            📊 STATS
          </button>
          <button
            className="px-btn px-btn-ghost"
            style={{ fontSize: '0.55rem', padding: '6px 8px' }}
            onClick={() => { clearSession(); navigate('/login'); }}
          >
            SWITCH
          </button>
        </div>
      </div>

      {/* Center Card */}
      <div className="px-panel" style={styles.card}>
        {mode === 'menu' && (
          <>
            <h1 className="px-head" style={styles.title}>GAME LOBBY</h1>
            <p className="px-body" style={styles.sub}>Start a new world or join a friend's room.</p>
            
            <button className="px-btn" style={styles.bigBtn} onClick={() => setMode('create')}>
              + CREATE GAME
            </button>
            
            <div className="px-body" style={styles.or}>— or —</div>
            
            <button className="px-btn px-btn-yellow" style={styles.bigBtn} onClick={() => setMode('join')}>
              ▶ JOIN GAME
            </button>

            <button 
              className="px-btn px-btn-dark" 
              style={{ fontSize: '0.75rem', padding: '10px', marginTop: '6px' }}
              onClick={() => setMode('stats')}
            >
              🏆 VIEW LIFETIME STATS
            </button>
          </>
        )}

        {mode === 'create' && (
          <>
            <h1 className="px-head" style={styles.title}>CREATE GAME</h1>
            <p className="px-body" style={styles.sub}>
              Playing as <strong>{profile.username}</strong> {profile.avatar}
            </p>
            
            <div style={styles.infoBox}>
              <p className="px-body" style={{ margin: 0, fontSize: '0.85rem', color: '#1a1a2e' }}>
                🎮 A unique <strong>6-character room code</strong> &amp; <strong>scan-to-join QR code</strong> will be generated immediately for your friends!
              </p>
            </div>

            {error && <div className="px-body" style={styles.error}>{error}</div>}
            
            <div style={styles.btnRow}>
              <button className="px-btn px-btn-dark" style={styles.halfBtn} onClick={() => { setMode('menu'); setError(''); }}>
                ← BACK
              </button>
              <button className="px-btn" style={styles.halfBtn} onClick={createGame} disabled={busy}>
                {busy ? 'CREATING...' : 'CREATE & GET QR ▶'}
              </button>
            </div>
          </>
        )}

        {mode === 'join' && (
          <>
            <h1 className="px-head" style={styles.title}>JOIN GAME</h1>
            <p className="px-body" style={{ ...styles.sub, marginBottom: '4px' }}>
              Enter 6-character room code or scan QR code
            </p>
            
            <label className="px-head" style={styles.label}>ROOM CODE</label>
            <input
              className="px-input"
              style={{
                textAlign: 'center',
                letterSpacing: '6px',
                textTransform: 'uppercase',
                fontFamily: 'Press Start 2P, monospace',
                fontSize: '1.25rem',
                padding: '12px',
              }}
              value={roomCode}
              maxLength={6}
              autoFocus
              placeholder="ABCDEF"
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinGame()}
            />
            
            {error && <div className="px-body" style={styles.error}>{error}</div>}
            
            <div style={styles.btnRow}>
              <button className="px-btn px-btn-dark" style={styles.halfBtn} onClick={() => { setMode('menu'); setError(''); }}>
                ← BACK
              </button>
              <button className="px-btn px-btn-yellow" style={styles.halfBtn} onClick={joinGame} disabled={busy || roomCode.length < 6}>
                {busy ? 'JOINING...' : 'JOIN ▶'}
              </button>
            </div>
          </>
        )}

        {mode === 'stats' && (
          <>
            <h1 className="px-head" style={styles.title}>CAREER STATS</h1>
            <p className="px-body" style={styles.sub}>
              Lifetime record for <strong>{profile.username}</strong> {profile.avatar}
            </p>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div className="px-head" style={styles.statVal}>{profile.gamesPlayed}</div>
                <div className="px-body" style={styles.statLbl}>GAMES PLAYED</div>
              </div>
              <div style={styles.statBox}>
                <div className="px-head" style={{ ...styles.statVal, color: '#2a9d8f' }}>{profile.wins}</div>
                <div className="px-body" style={styles.statLbl}>WINS ({winRate}%)</div>
              </div>
              <div style={styles.statBox}>
                <div className="px-head" style={{ ...styles.statVal, color: '#e63946' }}>{profile.losses}</div>
                <div className="px-body" style={styles.statLbl}>LOSSES</div>
              </div>
              <div style={styles.statBox}>
                <div className="px-head" style={{ ...styles.statVal, color: '#e08a2e' }}>{profile.roundsPlayed || 0}</div>
                <div className="px-body" style={styles.statLbl}>ROUNDS PLAYED</div>
              </div>
              <div style={styles.statBox}>
                <div className="px-head" style={{ ...styles.statVal, color: '#9b5de5' }}>{profile.problemsSolved || 0}</div>
                <div className="px-body" style={styles.statLbl}>CODE SOLVED</div>
              </div>
              <div style={styles.statBox}>
                <div className="px-head" style={{ ...styles.statVal, color: '#f77f00' }}>${profile.totalEarnings || 0}</div>
                <div className="px-body" style={styles.statLbl}>TOTAL EARNINGS</div>
              </div>
            </div>

            <div className="px-body" style={{ fontSize: '0.75rem', color: '#6b6652', marginTop: '8px' }}>
              🔒 Stats are permanently stored and updated after each round and game.
            </div>

            <button className="px-btn px-btn-dark" style={{ marginTop: '8px', fontSize: '0.75rem' }} onClick={() => setMode('menu')}>
              ← BACK TO LOBBY
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', gap: '24px' },
  topbar: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '10px' },
  playerChip: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  card: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '480px',
    padding: '32px',
    marginTop: '4vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    textAlign: 'center',
  },
  title: { fontSize: '1.2rem', margin: 0, color: '#e63946' },
  sub: { color: '#5a553f', margin: '4px 0 8px', fontSize: '1.1rem' },
  bigBtn: { fontSize: '0.95rem', padding: '16px' },
  or: { color: '#8a8266', fontSize: '1.1rem' },
  label: { fontSize: '0.62rem', color: '#5a553f', textAlign: 'left', marginBottom: '6px' },
  error: { color: '#c1121f', fontSize: '1.15rem' },
  btnRow: { display: 'flex', gap: '12px', marginTop: '8px' },
  halfBtn: { flex: 1, fontSize: '0.78rem' },
  infoBox: {
    background: 'rgba(255, 255, 255, 0.75)',
    border: '2px dashed #9b8c66',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'left',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginTop: '6px',
    marginBottom: '6px',
  },
  statBox: {
    background: '#ffffff',
    border: '3px solid #1a1a2e',
    borderRadius: '6px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: 'inset -2px -2px 0 0 rgba(0,0,0,0.15)',
  },
  statVal: {
    fontSize: '1rem',
    margin: 0,
    color: '#1a1a2e',
  },
  statLbl: {
    fontSize: '0.7rem',
    color: '#6b6652',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
};

