# RJPQ Collaboration Tool

Next.js frontend + Node.js WebSocket backend for a multiplayer Romeo and Juliet PQ helper.

## Apps

- `apps/web`: Next.js client
- `apps/server`: Node.js + WebSocket realtime server

## Run

1. Install dependencies from the repo root:

```bash
npm install
```

2. Start the backend:

```bash
npm run dev:server
```

3. Start the frontend in a second terminal:

```bash
npm run dev:web
```

## Environment

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

Create `apps/server/.env` if you want a custom port:

```bash
PORT=8080
CLIENT_ORIGIN=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

## Production deployment

Minimum production flow from the repo root:

```bash
npm run build
npm run start:server
npm run start:web
```

Recommended production environment variables:

Frontend:

```bash
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com
```

Backend:

```bash
PORT=8080
CLIENT_ORIGIN=https://your-frontend-domain.com
REDIS_URL=redis://default:<password>@<your-redis-host>:6379
```

Deployment notes:

- Do not expose `npm run dev:web` or `npm run dev:server` to the public internet.
- If the frontend uses HTTPS, the backend WebSocket URL should usually use `wss://`.
- If `NEXT_PUBLIC_WS_URL` is not set, the frontend will try the current hostname with port `8080`.
- Room state is stored in Redis.
- Rooms with 0 or 1 player for 15 minutes are deleted automatically.
- A room can contain at most 4 players.

## Current scope

- Create room
- Join room with optional password
- Share room code / link
- Realtime synchronized stage grid
- Player presence and color selection

## Pending product decisions

- Exact number of stages and cells per stage
- Host moderation features
- Persistence strategy
- Rate limiting / auth / observability for production
