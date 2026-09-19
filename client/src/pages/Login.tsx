import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/session';

const AVATARS = ['💻', '🐍', '🚀', '🤖', '🦊', '👾', '🎮', '⚡'];

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('💻');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const name = username.trim();
    if (!name) {
      setError('Enter a username to continue.');
      return;
    }
    if (name.length > 20) {
      setError('Max 20 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(name, avatar);
      navigate('/lobby');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not reach the server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-theme" style={styles.root}>
      <div style={styles.grid} />

      <div className="px-panel" style={styles.card}>
        <div style={styles.logoRow}>
          <span className="px-qblock">?</span>
          <h1 className="px-head" style={styles.logo}>
            <span style={{ color: '#e63946' }}>CODE</span>
            <span style={{ color: '#1a1a2e' }}>POLY</span>
          </h1>
        </div>

        <h2 className="px-head" style={styles.title}>CHOOSE YOUR NAME</h2>
        <p className="px-body" style={styles.sub}>No email. Just pick a name and play.</p>

        <label className="px-head" style={styles.label}>USERNAME</label>
        <input
          className="px-input"
          value={username}
          maxLength={20}
          autoFocus
          placeholder="e.g. neo_coder"
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        <label className="px-head" style={{ ...styles.label, marginTop: '14px' }}>PICK AVATAR</label>
        <div style={styles.avatarRow}>
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              style={{
                ...styles.avatarBtn,
                background: avatar === a ? '#ffd23f' : '#fffdf5',
                boxShadow:
                  avatar === a
                    ? 'inset -3px -3px 0 0 #c99b1e, inset 3px 3px 0 0 #fff2a8'
                    : 'inset -3px -3px 0 0 #e6dcc0, inset 3px 3px 0 0 #fff',
              }}
            >
              {a}
            </button>
          ))}
        </div>

        {error && <div className="px-body" style={styles.error}>{error}</div>}

        <button className="px-btn" style={styles.submit} onClick={submit} disabled={loading}>
          {loading ? 'LOADING...' : 'ENTER ▶'}
        </button>
        <button className="px-btn px-btn-ghost" style={styles.back} onClick={() => navigate('/')}>
          ← BACK
        </button>
      </div>
    </div>
  );
}

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
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '30px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' },
  logo: { fontSize: '1.4rem', margin: 0 },
  title: { fontSize: '1rem', margin: '22px 0 6px', color: '#1a1a2e', textAlign: 'center' },
  sub: { margin: '0 0 20px', color: '#5a553f', textAlign: 'center', fontSize: '1.2rem' },
  label: { fontSize: '0.62rem', color: '#5a553f', display: 'block', marginBottom: '8px' },
  avatarRow: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' },
  avatarBtn: {
    aspectRatio: '1 / 1',
    fontSize: '1.1rem',
    border: '3px solid #1a1a2e',
    cursor: 'pointer',
  },
  error: { color: '#c1121f', marginTop: '14px', fontSize: '1.15rem' },
  submit: { width: '100%', marginTop: '20px', fontSize: '0.95rem', padding: '15px' },
  back: { width: '100%', marginTop: '10px', fontSize: '0.7rem' },
};
