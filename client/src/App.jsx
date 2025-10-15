// src/App.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingGate from "./components/LoadingGate.jsx";
import Lobby from "./components/Lobby.jsx";
import GameBoard from "./components/GameBoard.jsx";          // ⬅️ NEW
import { initDiscord } from "./sdk/discord.js";
import { connectPresence } from "./sdk/presence.js";
import { connect } from "./sdk/ws";                // ⬅️ NEW

const TIPS = [
  "Tip: Wolves win at parity—don’t tunnel on one suspect.",
  "Tip: Soft‑claiming roles can bait wolves. Risky!",
  "Tip: Vote history tells a story.",
  "Tip: Seer results? Confirm if you must, but beware of counter‑claims.",
];

export default function App() {
  const [phase, setPhase] = useState("boot");
  const [me, setMe] = useState(null);

  // Presence (your existing lobby socket)
  const [wsApi, setWsApi] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Game socket state (from our new WS engine)
  const [gameState, setGameState] = useState(null);           // ⬅️ NEW

  const boot = useCallback(async () => {
    const { sdk, user } = await initDiscord();
    return { sdk, user };
  }, []);

  const onBooted = useCallback(({ sdk, user }) => {
    setMe(user);
    const api = connectPresence({
      sdk,
      me: user,
      onState: (state) => {
        setRoomState(state);
        if (state.phase === "LOBBY") {
          setPhase("lobby");
          setGameState(null);
        } else {
          setGameState(state);
          setPhase("game");
        }
      },
      onConnection: (connected) => setWsConnected(connected),
    });
    setWsApi(api);
    setPhase("lobby");
  }, []);

  // Clean up presence socket on unmount
  useEffect(() => () => wsApi?.close?.(), [wsApi]);

  // === NEW: Join handler the Lobby will call ===
  function join(roomId, id, name) {
    // Ensure socket configuration knows about the lobby identity.
    connect({
      roomId,
      id,
      name,
      avatar: me?.avatar || null,
    });
  }

  const content = useMemo(() => {
    switch (phase) {
      case "boot":
        return (
          <LoadingGate
            loader={boot}
            onLoaded={onBooted}
            title="Connecting to Discord…"
            subtitle="Sharpening pitchforks and silver bullets"
            tips={TIPS}
          />
        );
      case "lobby":
        return (
          <Lobby
            me={me}
            state={roomState}
            presence={wsApi}
            wsConnected={wsConnected}
            onJoin={join}
          />
        );
      case "game":
        return gameState ? (
          <GameBoard state={gameState} />      // ⬅️ render the live game view
        ) : (
          <div className="panel" style={{ textAlign: "center" }}>
            <h2>Waiting for game state…</h2>
            <p style={{ opacity: 0.8 }}>If this hangs, make sure your server WS is running and Lobby called onJoin().</p>
            <button style={{ marginTop: 16 }} onClick={() => setPhase("lobby")}>
              (Dev) Back to Lobby
            </button>
          </div>
        );
      default:
        return null;
    }
  }, [phase, me, roomState, wsApi, wsConnected, boot, onBooted, gameState]);

  return <div>{content}</div>;
}
