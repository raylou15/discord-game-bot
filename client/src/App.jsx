// src/App.jsx (only the LoadingGate usage changed a bit)
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingGate from "./components/LoadingGate.jsx";
import Lobby from "./components/Lobby.jsx";
import { initDiscord } from "./sdk/discord.js";
import { connectPresence } from "./sdk/presence.js";

const TIPS = [
  "Tip: Wolves win at parity—don’t tunnel on one suspect.",
  "Tip: Soft‑claiming roles can bait wolves. Risky!",
  "Tip: Vote history tells a story.",
  "Tip: Seer results? Confirm if you must, but beware of counter‑claims.",
];

export default function App() {
  const [phase, setPhase] = useState("boot");
  const [me, setMe] = useState(null);
  const [wsApi, setWsApi] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

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
        if (state.started) setPhase("game");
      },
      onConnection: (connected) => setWsConnected(connected),
    });
    setWsApi(api);
    setPhase("lobby");
  }, []);

  useEffect(() => () => wsApi?.close?.(), [wsApi]);

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
        return <Lobby me={me} state={roomState} api={wsApi} wsConnected={wsConnected} />;
      case "game":
        return (
          <div className="panel" style={{ textAlign: "center" }}>
            <h2>Game Scene</h2>
            <p style={{ opacity: 0.8 }}>
              Lobby locked. You can now implement role assignment and night/day cycles.
            </p>
            <button style={{ marginTop: 16 }} onClick={() => setPhase("lobby")}>
              (Dev) Back to Lobby
            </button>
          </div>
        );
      default:
        return null;
    }
  }, [phase, me, roomState, wsApi, wsConnected, boot, onBooted]);

  return <div>{content}</div>;
}
