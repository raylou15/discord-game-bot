// client/src/sdk/presence.js
import { connect, onMessage, onConnectionChange, send, close as closeSocket } from "./ws";

export function connectPresence({ sdk, me, onState, onConnection }) {
  let reconnectTimer;
  let manualClose = false;

  const roomId = sdk?.channelId || sdk?.guildId || "dev-room";
  const name = me?.username || me?.global_name || me?.display_name || "Unknown";
  const avatar = me?.avatar || null;

  const config = { roomId, id: me?.id, name, avatar };

  if (!config.id) {
    throw new Error("connectPresence requires a Discord user id");
  }

  onConnection?.(false);

  const offMessage = onMessage((m) => {
    if (m.type === "state") onState(m.state);
    if (m.type === "error") console.error("Server error:", m.error);
  });

  const offConn = onConnectionChange((connected) => {
    onConnection?.(connected);
    if (!connected && !manualClose) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        try {
          connect(config, { force: true });
        } catch (err) {
          console.error("[presence] reconnect failed", err);
        }
      }, 3000);
    }
  });

  connect(config);

  return {
    setReady(ready) {
      send("toggleReady", { ready: !!ready });
    },
    startGame() {
      send("start");
    },
    nightAction(targetId) {
      send("nightAction", { targetId });
    },
    vote(targetId) {
      send("vote", { targetId });
    },
    resetGame() {
      send("reset");
    },
    updateSettings(settings) {
      send("updateSettings", { settings });
    },
    addBots(count = 6) {
      fetch("/api/dev/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: config.roomId, count }),
      });
    },
    close() {
      manualClose = true;
      clearTimeout(reconnectTimer);
      offMessage();
      offConn();
      closeSocket();
    },
  };
}
