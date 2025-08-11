// client/src/sdk/ws.js
let ws;
let listeners = new Set();

const serverOrigin =
  import.meta.env.DEV
    ? (import.meta.env.VITE_SERVER_ORIGIN ?? "http://localhost:3001")
    : window.location.origin;

export function connect(roomId, id, name) {
  const proto = serverOrigin.startsWith("https") ? "wss" : "ws";
  const url = `${proto}://${serverOrigin.replace(/^https?:\/\//, "")}/ws` +
              `?roomId=${encodeURIComponent(roomId)}` +
              `&id=${encodeURIComponent(id)}` +
              `&name=${encodeURIComponent(name || "")}`;
  ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    try { const msg = JSON.parse(ev.data); listeners.forEach(fn => fn(msg)); } catch {}
  };
  return ws;
}

export function onMessage(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function send(type, payload = {}) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type, ...payload }));
}
