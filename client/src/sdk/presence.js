// src/sdk/presence.js
let ws = null;

export function connectPresence({ sdk, me, onState, onConnection }) {
  const roomId = `${sdk.guildId || "g"}:${sdk.channelId || "c"}`;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const base = `${proto}://${location.host}`;
  const url =
    `${base}/ws?roomId=${encodeURIComponent(roomId)}` +
    `&id=${encodeURIComponent(me.id)}` +
    `&name=${encodeURIComponent(me.global_name || me.username)}` +
    `&avatar=${encodeURIComponent(me.avatar || "")}` +
    `&discrim=${encodeURIComponent(me.discriminator || "0")}` +
    `&guildId=${encodeURIComponent(sdk.guildId || "")}` +
    `&channelId=${encodeURIComponent(sdk.channelId || "")}`;

  let isOpen = false;
  let manualClose = false;
  let pending = [];
  let reconnectTimer = null;

  function flush() { for (const m of pending) ws?.send(m); pending = []; }
  function safeSend(obj) {
    const str = JSON.stringify(obj);
    if (isOpen && ws?.readyState === WebSocket.OPEN) ws.send(str);
    else pending.push(str);
  }

  function connect() {
    ws = new WebSocket(url);
    ws.onopen = () => { isOpen = true; onConnection?.(true); flush(); };
    ws.onmessage = (ev) => {
      try { const msg = JSON.parse(ev.data); if (msg.type === "state") onState(msg); }
      catch { }
    };
    ws.onerror = () => { };
    ws.onclose = () => {
      isOpen = false; onConnection?.(false);
      if (!manualClose) { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connect, 2000); }
    };
  }

  connect();

  return {
    setReady(ready) { safeSend({ type: "ready", ready: !!ready }); },
    updateSettings(partial) { safeSend({ type: "settings", settings: partial }); },
    startGame() { safeSend({ type: "start" }); },
    close() { manualClose = true; clearTimeout(reconnectTimer); ws?.close(); },
  };
}
