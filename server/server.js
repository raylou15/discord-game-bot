// server/server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { Engine } from "./gameEngine.js";
import { fileURLToPath } from "url";
import path from "path";

// ---- Load env from root folder ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(express.json());

// ---- Serve client build ----
const clientDist = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDist));

// ---- OAuth token exchange ----
app.post("/api/token", async (req, res) => {
  try {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
      return res.status(500).json({
        error: "Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET in .env"
      });
    }
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing OAuth code" });

    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
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
    console.error("Token exchange failed:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ---- SPA fallback for React Router ----
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// =================== BotManager ===================
/**
 * Simple server-side bots that:
 *  - join/leave a room
 *  - auto-ready
 *  - submit night actions if their role has one (engine ignores if not)
 *  - vote during the day
 *
 * Implementation notes:
 *  - Bots don’t need private role info. We just call Engine APIs; the engine
 *    ignores actions from roles that can’t act at night.
 *  - We schedule actions once per phase using a room-local marker.
 */
const botsByRoom = new Map(); // roomId -> Map(botId -> { name })
const phaseMarker = new Map(); // roomId -> string (last scheduled phase)
const hunterMarker = new Map(); // roomId -> pending hunter id handled

function randomDelay(minMs = 400, maxMs = 1500) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addBots(roomId, count = 5) {
  const roomBots = botsByRoom.get(roomId) || new Map();
  for (let i = 0; i < count; i++) {
    const id = `bot_${Math.random().toString(36).slice(2, 10)}`;
    const name = `Bot ${roomBots.size + 1} 🤖`;
    // Not host; join + ready
    Engine.join(roomId, { id, name, avatar: null }, false);
    Engine.toggleReady(roomId, id, true);
    roomBots.set(id, { name });
  }
  botsByRoom.set(roomId, roomBots);
}

function removeBots(roomId) {
  const roomBots = botsByRoom.get(roomId);
  if (!roomBots) return;
  for (const botId of roomBots.keys()) {
    Engine.leave(roomId, botId);
  }
  botsByRoom.delete(roomId);
  phaseMarker.delete(roomId);
  hunterMarker.delete(roomId);
}

/**
 * Called after any state change to schedule bot actions once per phase.
 */
function maybeScheduleBots(roomId) {
  const bots = botsByRoom.get(roomId);
  if (!bots || bots.size === 0) return;

  const state = Engine.getPublicState(roomId); // public state is enough

  const aliveSet = new Set(state.aliveIds || []);
  const alivePlayers = state.players.filter(p => aliveSet.has(p.id));

  const pendingHunterId = state.pendingHunter?.player?.id;
  if (pendingHunterId) {
    if (bots.has(pendingHunterId) && hunterMarker.get(roomId) !== pendingHunterId) {
      hunterMarker.set(roomId, pendingHunterId);
      const choices = alivePlayers.filter(p => p.id !== pendingHunterId);
      const target = choices.length ? randFrom(choices) : null;
      setTimeout(() => {
        try {
          Engine.hunterShoot(roomId, pendingHunterId, target?.id || null);
          broadcast(roomId);
        } catch { }
      }, randomDelay());
    }
    return;
  }

  hunterMarker.delete(roomId);

  const currentPhase = state.phase;
  const last = phaseMarker.get(roomId);
  if (last === currentPhase) return; // already scheduled for this phase

  phaseMarker.set(roomId, currentPhase);

  // If lobby just started, auto-start when everyone (including bots) is ready.
  if (currentPhase === "LOBBY") {
    // Nothing to schedule; your host will click Start.
    return;
  }

  if (currentPhase === "NIGHT") {
    // Schedule each bot's night action (if their role has one, engine will accept; else ignored)
    for (const [botId] of bots) {
      if (!aliveSet.has(botId)) continue;
      // pick any alive target != bot
      const choices = alivePlayers.filter(p => p.id !== botId);
      if (choices.length === 0) continue;
      const target = randFrom(choices);
      setTimeout(() => {
        try {
          Engine.submitNightAction(roomId, botId, { targetId: target.id });
          broadcast(roomId); // propagate any change
        } catch { }
      }, randomDelay());
    }
  }

  if (currentPhase === "DAY") {
    // Schedule each bot's vote
    for (const [botId] of bots) {
      if (!aliveSet.has(botId)) continue;
      const abstain = Math.random() < 0.10; // 10% abstain
      let voteId = null;
      if (!abstain) {
        const choices = alivePlayers; // include self; voting self is okay
        if (choices.length) voteId = randFrom(choices).id;
      }
      setTimeout(() => {
        try {
          Engine.vote(roomId, botId, voteId);
          broadcast(roomId);
        } catch { }
      }, randomDelay(600, 1800));
    }
  }

  // ENDED: no scheduling
}

// ---- Dev endpoints ----
app.post("/api/dev/bots", (req, res) => {
  try {
    const { roomId, count = 5 } = req.body || {};
    if (!roomId) return res.status(400).json({ error: "roomId required" });
    addBots(roomId, Number(count) || 5);
    const state = Engine.getPublicState(roomId);
    // If there is no host yet (all bots), do not auto-start; host should be human.
    res.json({ ok: true, bots: botsByRoom.get(roomId)?.size || 0, state });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/api/dev/bots", (req, res) => {
  try {
    const { roomId } = req.body || {};
    if (!roomId) return res.status(400).json({ error: "roomId required" });
    removeBots(roomId);
    const state = Engine.getPublicState(roomId);
    res.json({ ok: true, state });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// =================== WebSocket plumbing ===================

function parseQuery(url) {
  const qIndex = url.indexOf("?");
  const q = new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : "");
  return Object.fromEntries(q.entries());
}

function safeSend(ws, data) {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (err) {
    console.warn("Failed to send to client:", err);
  }
}

function broadcast(roomId) {
  const publicState = Engine.getPublicState(roomId);
  // Schedule bot moves (once per phase)
  maybeScheduleBots(roomId);

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN && client.roomId === roomId) {
      safeSend(client, { type: "state", state: publicState });
    }
  });
}

// ---- WebSocket Connection ----
wss.on("connection", (ws, req) => {
  const { roomId, id, name, avatar } = parseQuery(req.url || "");

  if (!roomId || !id) {
    safeSend(ws, { type: "error", error: "Missing roomId or id" });
    ws.close();
    return;
  }

  ws.roomId = roomId;
  ws.playerId = id;
  ws.playerName = name || `Player-${id.slice(0, 4)}`;
  ws.avatar = avatar || null;

  console.log(`🔌 Player connected: ${ws.playerName} (${ws.playerId}) to room ${roomId}`);

  const state = Engine.join(roomId, { id, name: ws.playerName, avatar: ws.avatar }, false);
  safeSend(ws, { type: "state", state });
  broadcast(roomId);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      console.warn("Invalid WS message:", raw.toString());
      return;
    }

    try {
      let updatedState = null;

      switch (msg.type) {
        case "joinRoom":
          // Allow client to explicitly join/rejoin
          updatedState = Engine.join(
            roomId,
            { id: ws.playerId, name: ws.playerName, avatar: ws.avatar },
            msg.asHost || false
          );
          break;

        case "identify":
          // Simple ack to let the client know we see them
          safeSend(ws, { type: "identified", playerId: ws.playerId, name: ws.playerName });
          updatedState = Engine.getPublicState(roomId);
          break;

        case "ping":
          safeSend(ws, { type: "pong", ts: Date.now() });
          return; // don’t broadcast state

        case "becomeHost":
          Engine.join(roomId, { id: ws.playerId, name: ws.playerName }, true);
          updatedState = Engine.getPublicState(roomId);
          break;

        case "toggleReady":
          updatedState = Engine.toggleReady(roomId, ws.playerId, !!msg.ready);
          break;

        case "start":
          updatedState = Engine.start(roomId, ws.playerId);
          break;

        case "nightAction":
          updatedState = Engine.submitNightAction(roomId, ws.playerId, {
            targetId: msg.targetId || null
          });
          break;

        case "updateSettings":
          updatedState = Engine.updateSettings(roomId, ws.playerId, msg.settings || {});
          break;

        case "vote":
          updatedState = Engine.vote(roomId, ws.playerId, msg.targetId ?? null);
          break;

        case "hunterShoot":
          updatedState = Engine.hunterShoot(roomId, ws.playerId, msg.targetId || null);
          break;

        case "reset":
          updatedState = Engine.reset(roomId, ws.playerId);
          break;

        default:
          console.warn("Unknown WS message type:", msg.type);
          return;
      }

      if (updatedState) {
        safeSend(ws, { type: "state", state: updatedState });
        broadcast(roomId);
      }
    } catch (err) {
      console.error("Error handling WS message:", err);
      safeSend(ws, { type: "error", error: String(err?.message || err) });
    }
  });

  ws.on("close", () => {
    console.log(`❌ Player disconnected: ${ws.playerName} from room ${roomId}`);
    Engine.leave(roomId, ws.playerId);
    broadcast(roomId);
  });
});

// ---- Upgrade HTTP to WS ----
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/ws")) {
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req)
    );
  } else {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
