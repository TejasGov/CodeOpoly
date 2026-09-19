# CodeOpoly 🎮💻

**Competitive Coding Meets Monopoly** — a real-time multiplayer game that combines the classic
Monopoly board with LeetCode-style coding challenges. Solve problems to earn money, buy
properties, and challenge opponents to code duels instead of paying rent.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (`client/`)
- **Backend**: Node.js + Express + Socket.io (`server/`)
- **Database**: MongoDB via Mongoose, with an in-memory fallback store if MongoDB isn't connected
- **Code Execution**: Judge0 API (via RapidAPI)
- **Auth**: Firebase Authentication (Google / Microsoft OAuth)

```
CodeOpoly/
├── client/            # Vite React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       └── data/
└── server/            # Express + Socket.io backend
    └── src/
        ├── models/    # Mongoose schemas
        ├── routes/
        ├── socket/
        └── utils/
```

## Game Features

- Real-time multiplayer (2–4 players) over Socket.io
- 40-space Monopoly board with tech-themed properties
- Solve coding problems to buy properties
- Code duels: challenge a property owner to avoid paying rent
- Property upgrades (houses/hotels), Debug Hell (jail with bug-fixing), Chance/Community Chest events

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas) — optional, falls back to an in-memory store if not connected
- A RapidAPI account for Judge0 code execution

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

**`server/.env`**
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/codeopoly
CLIENT_URLS=http://localhost:3000
RAPIDAPI_KEY=your-rapidapi-key-here
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
```

**`client/.env`**
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

> ⚠️ **Known issue**: `client/src/services/judge0Service.ts` currently calls the RapidAPI Judge0
> endpoint directly from the browser using `VITE_JUDGE0_API_KEY`. Anything prefixed `VITE_` is
> bundled into the client JS and is visible to anyone who opens dev tools — so if that key is
> ever set, it's effectively public. The server already has its own `judge0Service.ts` wired into
> `socketHandlers.ts`; code execution should be routed entirely through the server so the RapidAPI
> key never ships to the browser. Not fixed yet — flagging so it isn't shipped as-is.

### 3. Run it

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Socket.io Events

**Client → Server**: `join-game`, `roll-dice`, `buy-property`, `challenge-duel`,
`submit-duel-code`, `end-turn`, `get-game-state`

**Server → Client**: `joined-game`, `player-joined`, `dice-rolled`, `landed-on-space`,
`property-bought`, `duel-started`, `duel-progress`, `duel-ended`, `turn-ended`, `game-state`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md).

## License

MIT
