# Deployment

CodeOpoly deploys in two separate pieces: the Vite frontend and the Express/Socket.io backend.

## Frontend (Vercel)

1. Sign in to [vercel.com](https://vercel.com) with GitHub.
2. Import the repo, and set the project's **Root Directory** to `client`.
3. Vercel will pick up `client/vercel.json` (build command `npm run build`, output `dist`).
4. Set environment variables (`VITE_FIREBASE_*`) in the Vercel project settings.
5. Deploy.

## Backend (Railway)

1. Sign in to [railway.app](https://railway.app) with GitHub.
2. Create a new project → **Deploy from GitHub repo** → select this repo.
3. In the service's **Settings**, set **Root Directory** to `server`.
4. Set environment variables: `PORT`, `MONGODB_URI`, `CLIENT_URLS`, `RAPIDAPI_KEY`, `JUDGE0_API_URL`.
5. Build command: `npm run build`. Start command: `npm start`.
6. Once deployed, update the frontend's `VITE_API_URL`/`VITE_SOCKET_URL` (or equivalent proxy
   config) to point at the Railway URL, and update `CLIENT_URLS` on the backend to match the
   deployed frontend origin (CORS is locked to this list in `server/src/index.ts`).

Render is also supported (`server/render.yaml` is checked in) as an alternative to Railway.

## MongoDB

Use [MongoDB Atlas](https://www.mongodb.com/atlas) for a hosted database, or point `MONGODB_URI`
at a self-hosted instance. If MongoDB isn't reachable, the backend automatically falls back to an
in-memory store (`server/src/utils/memoryStore.ts`) — fine for local dev, but game state won't
survive a server restart in that mode.
