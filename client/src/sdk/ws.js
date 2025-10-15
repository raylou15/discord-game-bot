// client/src/sdk/ws.js
let ws;
let lastConfig = null;
const listeners = new Set();
const connectionListeners = new Set();

const serverOrigin =
  import.meta.env.DEV
    ? (import.meta.env.VITE_SERVER_ORIGIN ?? "http://localhost:3001")
    : window.location.origin;

function buildUrl({ roomId, id, name, avatar }) {
  const proto = serverOrigin.startsWith("https") ? "wss" : "ws";
  const params = new URLSearchParams({
    roomId,
    id,
    name: name || "",
  });
  if (avatar) params.set("avatar", avatar);
  return `${proto}://${serverOrigin.replace(/^https?:\/\//, "")}/ws?${params.toString()}`;
}

function notifyConnection(connected) {
  connectionListeners.forEach((fn) => {
    try {
      fn(connected);
    } catch (err) {
      console.error("[ws] connection listener error", err);
    }
  });
}

function attachHandlers(socket) {
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      listeners.forEach((fn) => fn(msg));
    } catch (err) {
      console.warn("[ws] Failed to parse message", err);
    }
  };

  socket.onopen = () => notifyConnection(true);
  socket.onclose = () => {
    notifyConnection(false);
    if (ws === socket) {
      ws = null;
    }
  };
  socket.onerror = (err) => {
    console.error("[ws] socket error", err);
  };
}

export function connect(config = {}, { force = false } = {}) {
  lastConfig = { ...(lastConfig || {}), ...config };

  const shouldReuse =
    !force &&
    ws &&
    ws.readyState !== WebSocket.CLOSING &&
    ws.readyState !== WebSocket.CLOSED;

  if (shouldReuse) return ws;

  if (!lastConfig?.roomId || !lastConfig?.id) {
    throw new Error("roomId and id are required to open the game socket");
  }

  if (ws && ws.readyState !== WebSocket.CLOSED) {
    try {
      ws.close();
    } catch {}
  }

  const socket = new WebSocket(buildUrl(lastConfig));
  ws = socket;
  attachHandlers(socket);
  return socket;
}

export function reconnect() {
  if (!lastConfig) throw new Error("Cannot reconnect before connect() is called once");
  return connect(lastConfig, { force: true });
}

export function close() {
  if (ws) {
    try {
      ws.close();
    } catch {}
    ws = null;
  }
}

export function onMessage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onConnectionChange(fn) {
  connectionListeners.add(fn);
  return () => connectionListeners.delete(fn);
}

export function send(type, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type, ...payload }));
}
