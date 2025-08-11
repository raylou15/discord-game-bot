import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer } from "ws";

dotenv.config();

const app = express();
app.use(express.json());

// ---- OAuth token exchange (keep your existing one if already working) ----
app.post("/api/token", async (req, res) => {
  try {
    const { code } = req.body;
    const params = new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.REDIRECT_URI || "http://localhost:5173",
    });
    const r = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    res.json({ access_token: data.access_token });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---- HTTP -> WS upgrade ----
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// In‑memory room state (wipe on process restart)
const rooms = new Map();
// roomId -> { players: Map<socket, player>, started: bool, hostId: string }

function broadcast(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = {
    type: "state",
    roomId,
    started: room.started || false,
    hostId: room.hostId || null,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      ready: !!p.ready,
      isHost: p.id === room.hostId,
    })),
  };
  for (const sock of room.players.keys()) {
    if (sock.readyState === 1) sock.send(JSON.stringify(payload));
  }
}

function pickHost(room) {
  // First connected becomes host, or keep existing
  if (room.hostId && [...room.players.values()].some(p => p.id === room.hostId)) {
    return room.hostId;
  }
  const first = [...room.players.values()][0];
  room.hostId = first?.id || null;
}

wss.on("connection", (ws, request) => {
  // Expect ?roomId=...&id=...&name=...
  const params = new URLSearchParams(request.url.split("?")[1] || "");
  const roomId = params.get("roomId");
  const id = params.get("id");
  const name = params.get("name") || "Player";

  if (!roomId || !id) {
    ws.close();
    return;
  }

  if (!rooms.has(roomId)) rooms.set(roomId, { players: new Map(), started: false, hostId: null });
  const room = rooms.get(roomId);
  room.players.set(ws, { id, name, ready: false });

  pickHost(room);
  broadcast(roomId);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "ready") {
        const p = room.players.get(ws);
        if (p) p.ready = !!msg.ready;
        broadcast(roomId);
      } else if (msg.type === "start") {
        // Only host can start, and only when all ready
        if (room.hostId === id) {
          const allReady = [...room.players.values()].every((p) => p.ready);
          if (allReady) {
            room.started = true;
            broadcast(roomId);
          }
        }
      }
    } catch {}
  });

  ws.on("close", () => {
    const r = rooms.get(roomId);
    if (!r) return;
    r.players.delete(ws);
    if (r.players.size === 0) {
      rooms.delete(roomId);
    } else {
      pickHost(r);
      broadcast(roomId);
    }
  });
});

// Upgrade handler for /ws
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/ws")) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("Server running on :" + PORT));
