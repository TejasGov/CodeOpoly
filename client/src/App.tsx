import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import { getSession } from './lib/session';

function RequireAuth({ children }: { children: JSX.Element }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/lobby" element={<RequireAuth><Lobby /></RequireAuth>} />
        <Route path="/game/:gameId" element={<RequireAuth><GameRoom /></RequireAuth>} />
      </Routes>
    </Router>
  );
}

export default App;
