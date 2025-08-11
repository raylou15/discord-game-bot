// server/server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import path from "path";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const bot = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

bot.login(process.env.DISCORD_BOT_TOKEN).catch((e) => console.error("Bot login failed:", e));

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
      return res
        .status(500)
        .json({ error: "Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET in .env" });
    }

    const { code } = req.body;
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
    res.status(500).json({ error: String(e) });
  }
});

// ---- SPA fallback for React Router ----
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// ---- HTTP -> WS upgrade ----
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// In-memory room state
const rooms = new Map(); // roomId -> { players: Map, started, hostId, guildId, channelId, chat: [] }

function broadcast(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = {
    type: "state",
    roomId,
    started: room.started || false,
    hostId: room.hostId || null,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, discriminator: p.discriminator,
      ready: !!p.ready, isHost: p.id === room.hostId,
    })),
    chat: room.chat?.slice(-100) || [], // latest 100 msgs
  };
  for (const sock of room.players.keys()) {
    if (sock.readyState === 1) sock.send(JSON.stringify(payload));
  }
}

function pickHost(room) {
  if (room.hostId && [...room.players.values()].some((p) => p.id === room.hostId)) {
    return room.hostId;
  }
  const first = [...room.players.values()][0];
  room.hostId = first?.id || null;
}

wss.on("connection", (ws, request) => {
  const params = new URLSearchParams(request.url.split("?")[1] || "");
  const roomId = params.get("roomId");
  const id = params.get("id");
  const name = params.get("name") || "Player";

  if (!roomId || !id) {
    ws.close();
    return;
  }

  const avatar = params.get("avatar") || null;
  const discrim = params.get("discrim") || "0";

  const guildId = params.get("guildId") || null;
  const channelId = params.get("channelId") || null;

  if (!rooms.has(roomId)) rooms.set(roomId, { players: new Map(), started: false, hostId: null, guildId, channelId, chat: [] });
  const room = rooms.get(roomId);
  room.guildId = guildId;
  room.channelId = channelId;
  room.players.set(ws, { id, name, avatar, discriminator: discrim, ready: false });

  pickHost(room);
  broadcast(roomId);

  bot.on("messageCreate", (msg) => {
    // only mirror messages from a room's bound channel
    for (const [rid, r] of rooms.entries()) {
      if (!r.channelId || msg.channelId !== r.channelId) continue;
      // push and broadcast
      r.chat ||= [];
      r.chat.push({
        id: msg.id,
        name: msg.member?.displayName || msg.author.username,
        text: msg.content || "",
        ts: msg.createdTimestamp,
      });
      // keep memory bounded
      if (r.chat.length > 200) r.chat.splice(0, r.chat.length - 200);
      broadcast(rid);
    }
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

server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/ws")) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("Server running on :" + PORT));
