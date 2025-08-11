// src/sdk/presence.js
let ws = null;

export function connectPresence({ sdk, me, onState, onConnection }) {
  // One room per voice channel context
  const roomId = `${sdk.guildId || "g"}:${sdk.channelId || "c"}`;

  // Always connect to YOUR server host (Discord’s proxy host won’t accept /ws)
  const serverHost =
    import.meta.env.VITE_SERVER_HOST ||
    (typeof window !== "undefined" && window.SERVER_HOST) ||
    "operationpolitics.duckdns.org";

  const proto = "wss"; // you’re on HTTPS behind Caddy
  const base = `${proto}://${serverHost}`;
  const url = `${base}/ws?roomId=${encodeURIComponent(roomId)}&id=${encodeURIComponent(
    me.id
  )}&name=${encodeURIComponent(me.global_name || me.username)}`;

  let isOpen = false;
  let manualClose = false;
  let pending = [];
  let reconnectTimer = null;

  function log(...args) {
    console.log("[WS]", ...args);
  }

  function flush() {
    for (const msg of pending) ws?.send(msg);
    pending = [];
  }

  function safeSend(obj) {
    const str = JSON.stringify(obj);
    if (isOpen && ws?.readyState === WebSocket.OPEN) {
      ws.send(str);
    } else {
      log("queue", obj);
      pending.push(str);
    }
  }

  function connect() {
    log("connecting to", url);
    ws = new WebSocket(url);

    ws.onopen = () => {
      log("connected");
      isOpen = true;
      onConnection?.(true);
      flush();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "state") onState(msg);
      } catch (e) {
        log("bad message", e);
      }
    };

    ws.onerror = (err) => {
      log("error", err);
      // Let onclose handle reconnect
    };

    ws.onclose = (ev) => {
      log("closed", ev.code, ev.reason || "");
      isOpen = false;
      onConnection?.(false);
      if (!manualClose) {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 2000); // try again
      }
    };
  }

  connect();

  return {
    setReady(ready) {
      safeSend({ type: "ready", ready: !!ready });
    },
    startGame() {
      safeSend({ type: "start" });
    },
    close() {
      manualClose = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
