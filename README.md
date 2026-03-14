# Rotro — Dedicated Server

A 24/7 Node.js game server for Rotro (Beta).  
Players just visit your URL — no invite links needed.

## Project structure

```
rotro-server/
├── server.js          ← The game server (edit this to extend gameplay)
├── package.json       ← Dependencies
├── README.md          ← This file
└── public/
    └── index.html     ← The game client (served automatically)
```

---

## Deploy to Railway (recommended, free tier)

1. Create a free account at https://railway.app
2. Click **New Project → Deploy from GitHub repo**
3. Push this folder to a GitHub repo first:
   ```bash
   git init
   git add .
   git commit -m "Rotro server"
   git remote add origin https://github.com/YOUR_USERNAME/rotro-server.git
   git push -u origin main
   ```
4. In Railway, select your repo — it auto-detects Node.js
5. Railway will set `PORT` automatically — the server already reads it
6. Click **Generate Domain** → you get a free `*.railway.app` URL
7. Share that URL with players — done!

---

## Deploy to Render (also free)

1. Create a free account at https://render.com
2. Click **New → Web Service → Connect GitHub repo**
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Click **Create Web Service**
5. You get a free `*.onrender.com` URL

> ⚠️ Render free tier spins down after 15 min of inactivity.
> Use Railway or upgrade to avoid this.

---

## Deploy to Fly.io

1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
2. Run:
   ```bash
   fly auth login
   fly launch        # follow prompts, accepts defaults
   fly deploy
   ```
3. You get a `*.fly.dev` URL

---

## Run locally (for testing)

```bash
npm install
npm start
# Open http://localhost:3000
```

For auto-restart on file changes during development:
```bash
npm run dev   # uses nodemon
```

---

## Server API

The server exposes a status endpoint:

```
GET /status
```

Returns JSON with player count and positions:
```json
{
  "status": "online",
  "playerCount": 2,
  "players": [
    { "id": "abc123", "name": "Silas", "x": 5, "z": 12 }
  ],
  "uptime": "3600s"
}
```

---

## Socket.io events (for extending the server)

| Direction       | Event              | Payload                          |
|-----------------|--------------------|----------------------------------|
| client → server | `join`             | `{ name, parts }`                |
| client → server | `move`             | `{ x, y, z, ry, moving }`       |
| client → server | `appearance`       | `{ parts }`                      |
| client → server | `chat`             | `{ msg }`                        |
| server → client | `world_state`      | `[ ...players ]`                 |
| server → client | `player_joined`    | `{ id, name, parts, x, y, z }`  |
| server → client | `player_moved`     | `{ id, x, y, z, ry, moving }`   |
| server → client | `player_appearance`| `{ id, parts }`                  |
| server → client | `player_left`      | `{ id }`                         |
| server → client | `chat`             | `{ id?, name?, msg, system? }`   |
