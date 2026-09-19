import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, getSession, clearSession, type PlayerProfile } from '../lib/session';

type Mode = 'menu' | 'create' | 'join';

export default function Lobby() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate('/login');
      return;
    }
    setProfile(s);
  }, [navigate]);

  if (!profile) return null;

  const createGame = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/games/create`, {
        playerName: profile.username,
        avatar: profile.avatar,
      });
      const { gameId, roomCode: code, playerId } = res.data;
      navigate(`/game/${gameId}`, { state: { roomCode: code, playerId, playerName: profile.username } });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create game.');
    } finally {
      setBusy(false);
    }
  };

  const joinGame = async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Enter a 4-letter room code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/games/join`, {
        roomCode: code,
        playerName: profile.username,
        avatar: profile.avatar,
      });
      const { gameId, playerId } = res.data;
      navigate(`/game/${gameId}`, { state: { roomCode: code, playerId, playerName: profile.username } });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not join that room.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-theme px-sky-bg" style={styles.root}>
      <div className="px-cloud" style={{ top: '12%', left: 0, animationDuration: '48s' }} />
      <div className="px-cloud" style={{ top: '26%', left: 0, animationDuration: '70s', animationDelay: '-20s' }} />
      <div className="px-cloud" style={{ top: '8%', left: 0, animationDuration: '90s', animationDelay: '-50s' }} />

      {/* top bar */}
      <div className="px-panel" style={styles.topbar}>
        <div style={styles.brand}>
          <span className="px-qblock" style={{ width: 32, height: 32 }}>?</span>
          <span className="px-head" style={{ fontSize: '1rem' }}>
            <span style={{ color: '#e63946' }}>CODE</span>
            <span style={{ color: '#1a1a2e' }}>POLY</span>
          </span>
        </div>
        <div style={styles.playerChip}>
          <span style={{ fontSize: '1.2rem' }}>{profile.avatar}</span>
          <span className="px-head" style={{ fontSize: '0.7rem' }}>{profile.username}</span>
          <span className="px-body" style={{ fontSize: '1rem', color: '#5a553f' }}>
            {profile.wins}W · {profile.gamesPlayed}P
          </span>
          <button
            className="px-btn px-btn-ghost"
            style={{ fontSize: '0.55rem', padding: '6px 8px' }}
            onClick={() => { clearSession(); navigate('/login'); }}
          >
            SWITCH
          </button>
        </div>
      </div>

      {/* center card */}
      <div className="px-panel" style={styles.card}>
        {mode === 'menu' && (
          <>
            <h1 className="px-head" style={styles.title}>GAME LOBBY</h1>
            <p className="px-body" style={styles.sub}>Start a new world or join a friend's room.</p>
            <button className="px-btn" style={styles.bigBtn} onClick={() => setMode('create')}>+ CREATE GAME</button>
            <div className="px-body" style={styles.or}>— or —</div>
            <button className="px-btn px-btn-yellow" style={styles.bigBtn} onClick={() => setMode('join')}>▶ JOIN GAME</button>
          </>
        )}

        {mode === 'create' && (
          <>
            <h1 className="px-head" style={styles.title}>CREATE GAME</h1>
            <p className="px-body" style={styles.sub}>Playing as <strong>{profile.username}</strong> {profile.avatar}</p>
            <p className="px-body" style={{ ...styles.sub, marginTop: 0 }}>
              A room code will be generated to share with friends.
            </p>
            {error && <div className="px-body" style={styles.error}>{error}</div>}
            <div style={styles.btnRow}>
              <button className="px-btn px-btn-dark" style={styles.halfBtn} onClick={() => { setMode('menu'); setError(''); }}>← BACK</button>
              <button className="px-btn" style={styles.halfBtn} onClick={createGame} disabled={busy}>
                {busy ? '...' : 'CREATE ▶'}
              </button>
            </div>
          </>
        )}

        {mode === 'join' && (
          <>
            <h1 className="px-head" style={styles.title}>JOIN GAME</h1>
            <label className="px-head" style={styles.label}>ROOM CODE</label>
            <input
              className="px-input"
              style={{ textAlign: 'center', letterSpacing: '8px', textTransform: 'uppercase', fontFamily: 'Press Start 2P, monospace', fontSize: '1.2rem' }}
              value={roomCode}
              maxLength={4}
              autoFocus
              placeholder="ABCD"
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinGame()}
            />
            {error && <div className="px-body" style={styles.error}>{error}</div>}
            <div style={styles.btnRow}>
              <button className="px-btn px-btn-dark" style={styles.halfBtn} onClick={() => { setMode('menu'); setError(''); }}>← BACK</button>
              <button className="px-btn px-btn-yellow" style={styles.halfBtn} onClick={joinGame} disabled={busy}>
                {busy ? '...' : 'JOIN ▶'}
              </button>
            </div>
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
  playerChip: { display: 'flex', alignItems: 'center', gap: '10px' },
  card: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '460px',
    padding: '32px',
    marginTop: '6vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    textAlign: 'center',
  },
  title: { fontSize: '1.2rem', margin: 0, color: '#e63946' },
  sub: { color: '#5a553f', margin: '4px 0 8px', fontSize: '1.2rem' },
  bigBtn: { fontSize: '0.95rem', padding: '16px' },
  or: { color: '#8a8266', fontSize: '1.1rem' },
  label: { fontSize: '0.62rem', color: '#5a553f', textAlign: 'left', marginBottom: '6px' },
  error: { color: '#c1121f', fontSize: '1.15rem' },
  btnRow: { display: 'flex', gap: '12px', marginTop: '8px' },
  halfBtn: { flex: 1, fontSize: '0.78rem' },
};
