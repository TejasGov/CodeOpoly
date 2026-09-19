import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
  const res = await axios.post(`${API_URL}/auth/login`, { username, avatar });
  const user: PlayerProfile = res.data.user;
  setSession(user);
  return user;
}

export async function refreshProfile(username: string): Promise<PlayerProfile | null> {
  try {
    const res = await axios.get(`${API_URL}/users/${encodeURIComponent(username)}`);
    const user: PlayerProfile = res.data.user;
    setSession(user);
    return user;
  } catch {
    return null;
  }
}
