import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingGate from "./components/LoadingGate.jsx";
import Lobby from "./components/Lobby.jsx";
import { initDiscord } from "./sdk/discord.js";
import { connectPresence } from "./sdk/presence.js";

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

  useEffect(() => {
    return () => wsApi?.close?.();
  }, [wsApi]);

  const content = useMemo(() => {
    switch (phase) {
      case "boot":
        return (
          <LoadingGate
            loader={boot}
            onLoaded={onBooted}
            title="Connecting to Discord…"
            subtitle="Please wait while we prepare the lobby"
          />
        );
      case "lobby":
        return (
          <Lobby
            me={me}
            state={roomState}
            api={wsApi}
            wsConnected={wsConnected}
          />
        );
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
