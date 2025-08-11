// client/src/sdk/presence.js
import { connect, onMessage, send } from "./ws";

export function connectPresence({ sdk, me, onState, onConnection }) {
  let ws;
  let reconnectTimer;
  let manualClose = false;

  function safeSend(msg) {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    } catch (e) {
      console.warn("Failed to send WS message:", e);
    }
  }

  function connectWS() {
    const roomId =
      sdk?.channelId || sdk?.guildId || sdk?.instanceId || me?.id || "dev-room";
    const name = me?.username || me?.global_name || "Unknown";

    ws = connect(roomId, me?.id, name);

    onMessage((m) => {
      if (m.type === "state") {
        onState(m.state);
      } else if (m.type === "error") {
        console.error("Server error:", m.error);
      }
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
  }

  connectWS();

  return {
    // ✅ Match server.js message type
    setReady(ready) {
      safeSend({ type: "toggleReady", ready: !!ready });
    },
    startGame() {
      safeSend({ type: "start" });
    },
    nightAction(targetId) {
      safeSend({ type: "nightAction", targetId });
    },
    vote(targetId) {
      safeSend({ type: "vote", targetId });
    },
    resetGame() {
      safeSend({ type: "reset" });
    },
    close() {
      manualClose = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
