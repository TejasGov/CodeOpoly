import axios from 'axios';

export function getApiUrl(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('codepoly.backend_url') : null;
  if (custom) {
    const clean = custom.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:5001/api';
}

export function getSocketUrl(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('codepoly.backend_url') : null;
  if (custom) {
    const clean = custom.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return clean;
  }
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  return 'http://localhost:5001';
}

export function setCustomBackendUrl(url: string) {
  try {
    if (!url.trim()) {
      localStorage.removeItem('codepoly.backend_url');
    } else {
      localStorage.setItem('codepoly.backend_url', url.trim());
    }
  } catch {
    /* ignore */
  }
}

export const API_URL = getApiUrl();

export interface PlayerProfile {
  username: string;
  avatar: string;
  gamesPlayed: number;
  roundsPlayed: number;
  wins: number;
  losses: number;
  totalEarnings: number;
  problemsSolved: number;
}

const KEY = 'codepoly.player';

export function getSession(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlayerProfile) : null;
  } catch {
    return null;
  }
}

export function setSession(profile: PlayerProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// Username-only login: find-or-create a profile on the backend.
export async function login(username: string, avatar = '💻'): Promise<PlayerProfile> {
  const currentApiUrl = getApiUrl();
  const res = await axios.post(`${currentApiUrl}/auth/login`, { username, avatar });
  const user: PlayerProfile = res.data.user;
  setSession(user);
  return user;
}

export async function refreshProfile(username: string): Promise<PlayerProfile | null> {
  try {
    const currentApiUrl = getApiUrl();
    const res = await axios.get(`${currentApiUrl}/users/${encodeURIComponent(username)}`);
    const user: PlayerProfile = res.data.user;
    setSession(user);
    return user;
  } catch {
    return null;
  }
}

