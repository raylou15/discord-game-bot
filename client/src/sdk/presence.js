// client/src/sdk/presence.js
import { connect, onMessage } from "./ws";

export function connectPresence({ sdk, me, onState, onConnection }) {
  let reconnectTimer;
  let manualClose = false;

  function connectWS() {
    const roomId = sdk?.channelId || sdk?.guildId || "dev-room";
    const name = me?.username || me?.global_name || "Unknown";
    const avatar = me?.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
      : null;

    const ws = connect(roomId, me?.id, name, avatar);

    onMessage((m) => {
      if (m.type === "state") onState(m.state);
      if (m.type === "error") console.error("Server error:", m.error);
    });

    ws.onopen = () => {
      console.log("[presence] WS connected");
      onConnection(true);
    };

    ws.onclose = () => {
      console.log("[presence] WS disconnected");
      onConnection(false);
      if (!manualClose) {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWS, 3000);
      }
    };

    return ws;
  }

  const ws = connectWS();

  return {
    setReady(ready) {
      ws.send(JSON.stringify({ type: "toggleReady", ready: !!ready }));
    },
    startGame() {
      ws.send(JSON.stringify({ type: "start" }));
    },
    nightAction(targetId) {
      ws.send(JSON.stringify({ type: "nightAction", targetId }));
    },
    vote(targetId) {
      ws.send(JSON.stringify({ type: "vote", targetId }));
    },
    resetGame() {
      ws.send(JSON.stringify({ type: "reset" }));
    },
    addBots(count = 6) {
      fetch("/api/dev/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: sdk?.channelId || "dev-room", count }),
      });
    },
    close() {
      manualClose = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
