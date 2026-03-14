/**
 * Rotro - Dedicated Game Server
 * ==============================
 * Runs 24/7 on Railway / Render / Fly.io.
 * Handles all player connections, movement sync, and chat.
 *
 * Architecture:
 *   - Express serves the game HTML on GET /
 *   - Socket.io handles all real-time multiplayer
 *   - A "world state" object tracks every connected player
 *
 * To run locally:  node server.js
 * To deploy:       push this folder to Railway/Render (see README)
 */

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const path       = require("path");
const fs         = require("fs");

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*" },          // allow any origin (fine for a game)
  pingInterval: 10000,            // keep-alive ping every 10 s
  pingTimeout:  20000,            // drop connection after 20 s no response
});

// ─── Static files ─────────────────────────────────────────────────────────────
// Serves index.html (the game) from the same folder as this file.
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Optional: a simple status endpoint so you can ping it to check uptime
app.get("/status", (req, res) => {
  const players = Object.values(worldState).map(p => ({
    id:   p.id,
    name: p.name,
    x:    Math.round(p.x),
    z:    Math.round(p.z),
  }));
  res.json({
    status:      "online",
    playerCount: players.length,
    players,
    uptime:      Math.floor(process.uptime()) + "s",
  });
});

// ─── World state ──────────────────────────────────────────────────────────────
// socketId → { id, name, parts, x, y, z, ry, moving }
const worldState = {};

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── 1. Player joins ─────────────────────────────────────────────────────────
  // Client sends: { name, parts }
  socket.on("join", ({ name, parts }) => {
    if (!name) return;

    // Register in world state with a safe default position
    worldState[socket.id] = {
      id:     socket.id,
      name:   name.slice(0, 24),        // cap username length
      parts:  parts || defaultParts(),
      x: 0, y: 2.7, z: 0,
      ry: 0,
      moving: false,
    };

    console.log(`[join] ${name} (${socket.id})`);

    // Tell the new player about everyone already in the world
    socket.emit("world_state", Object.values(worldState).filter(p => p.id !== socket.id));

    // Tell everyone else about the new player
    socket.broadcast.emit("player_joined", worldState[socket.id]);

    // Broadcast system chat
    io.emit("chat", { system: true, msg: `${name} joined the world.` });
  });

  // ── 2. Movement ─────────────────────────────────────────────────────────────
  // Client sends: { x, y, z, ry, moving }
  socket.on("move", (data) => {
    const p = worldState[socket.id];
    if (!p) return;

    p.x = data.x; p.y = data.y; p.z = data.z;
    p.ry = data.ry; p.moving = data.moving;

    // Relay to everyone except sender
    socket.broadcast.emit("player_moved", {
      id: socket.id,
      x: p.x, y: p.y, z: p.z,
      ry: p.ry, moving: p.moving,
    });
  });

  // ── 3. Appearance update (colour change from avatar editor) ─────────────────
  // Client sends: { parts }
  socket.on("appearance", ({ parts }) => {
    const p = worldState[socket.id];
    if (!p) return;
    p.parts = parts;
    socket.broadcast.emit("player_appearance", { id: socket.id, parts });
  });

  // ── 4. Chat ─────────────────────────────────────────────────────────────────
  // Client sends: { msg }
  socket.on("chat", ({ msg }) => {
    const p = worldState[socket.id];
    if (!p || !msg) return;

    const clean = msg.slice(0, 120);  // cap message length
    console.log(`[chat] ${p.name}: ${clean}`);

    // Broadcast to everyone including sender so they see their own message
    io.emit("chat", { id: socket.id, name: p.name, msg: clean });
  });

  // ── 5. Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const p = worldState[socket.id];
    if (p) {
      console.log(`[-] ${p.name} disconnected`);
      io.emit("player_left",  { id: socket.id });
      io.emit("chat", { system: true, msg: `${p.name} left the world.` });
      delete worldState[socket.id];
    }
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function defaultParts() {
  return {
    head:     "#f9c5a0",
    torso:    "#d8c2ef",
    leftArm:  "#f9c5a0",
    rightArm: "#f9c5a0",
    leftLeg:  "#333333",
    rightLeg: "#333333",
  };
}

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n  🟥 Rotro server running on port ${PORT}`);
  console.log(`  🌐 Status: http://localhost:${PORT}/status\n`);
});
