// src/sdk/presence.js
let ws = null;

export function connectPresence({ sdk, me, onState, onConnection }) {
  const roomId = `${sdk.guildId || "g"}:${sdk.channelId || "c"}`;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/ws?roomId=${encodeURIComponent(
    roomId
  )}&id=${encodeURIComponent(me.id)}&name=${encodeURIComponent(
    me.global_name || me.username
  )}`;

  let isOpen = false;
  let pendingMessages = [];

  function connect() {
    console.log("[WS] Connecting to", url);
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("[WS] Connected");
      isOpen = true;
      onConnection?.(true);
      // Flush queued messages
      for (const msg of pendingMessages) ws.send(msg);
      pendingMessages = [];
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "state") onState(msg);
      } catch (e) {
        console.warn("[WS] Bad message", e);
      }
    };

    ws.onclose = (ev) => {
      console.warn("[WS] Disconnected", ev.code, ev.reason);
      isOpen = false;
      onConnection?.(false);
      // Auto-reconnect after 2s unless explicitly closed
      setTimeout(connect, 2000);
    };

    ws.onerror = (err) => {
      console.error("[WS] Error", err);
      ws.close();
    };
  }

  connect();

  function safeSend(data) {
    const str = JSON.stringify(data);
    if (isOpen && ws?.readyState === WebSocket.OPEN) {
      ws.send(str);
    } else {
      console.log("[WS] Queuing message until open", data);
      pendingMessages.push(str);
    }
  }

  return {
    setReady(ready) {
      safeSend({ type: "ready", ready: !!ready });
    },
    startGame() {
      safeSend({ type: "start" });
    },
    close() {
      console.log("[WS] Closing manually");
      ws?.close();
    },
  };
}
