let ws = null;

export function connectPresence({ sdk, me, onState }) {
  // Room key = guildId:channelId (DMs still get a stable channelId)
  const roomId = `${sdk.guildId || "g"}:${sdk.channelId || "c"}`;

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/ws?roomId=${encodeURIComponent(roomId)}&id=${encodeURIComponent(me.id)}&name=${encodeURIComponent(me.global_name || me.username)}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    // no-op
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "state") onState(msg);
    } catch {}
  };

  ws.onclose = () => {
    ws = null;
  };

  return {
    setReady(ready) {
      ws?.send(JSON.stringify({ type: "ready", ready: !!ready }));
    },
    startGame() {
      ws?.send(JSON.stringify({ type: "start" }));
    },
    close() {
      ws?.close();
    },
  };
}
