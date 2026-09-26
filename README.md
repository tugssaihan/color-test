# Color Showdown

A live, two-player color-spotting game. The React client and Node WebSocket server are intentionally small and run independently.

## Run locally

Open two terminals from this folder.

### 1. Start the server

```bash
cd server
npm install
npm run dev
```

The game server runs at `http://localhost:8787` and exposes WebSockets at `/socket`.

### 2. Start the client

```bash
cd client
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`) in two browser windows. Create a room in one and join it from the other using the four-character code.

For another device on the same network, open the LAN URL printed by Vite. The included Vite proxy forwards WebSocket traffic to the local game server. If the server lives elsewhere, create `client/.env.local` with:

```env
VITE_WS_URL=ws://YOUR_SERVER_HOST:8787/socket
```

## Checks

Run `npm run lint` from each folder. Run `npm run build` from `client/`.

Rooms and scores are held in memory and disappear when the server restarts.
