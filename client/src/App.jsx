// src/App.jsx
import { useCallback, useMemo, useState } from "react";
import LoadingGate from "./components/LoadingGate.jsx";
import Lobby from "./components/Lobby.jsx";
import { initDiscord } from "./sdk/discord.js";

export default function App() {
  const [state, setState] = useState({ phase: "boot", me: undefined });

  // Loader for LoadingGate
  const boot = useCallback(async () => {
    const { user } = await initDiscord();
    return user;
  }, []);

  const onBooted = useCallback((me) => {
    setState({ phase: "lobby", me });
  }, []);

  const onStart = useCallback(() => {
    setState((s) => ({ phase: "game", me: s.me }));
  }, []);

  const content = useMemo(() => {
    switch (state.phase) {
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
        return <Lobby me={state.me} onStart={onStart} players={[]} />;

      case "game":
        return (
          <div className="panel" style={{ textAlign: "center" }}>
            <h2>Game Scene</h2>
            <p style={{ opacity: 0.8 }}>This is where the game will happen.</p>
            <button
              style={{ marginTop: "16px" }}
              onClick={() => setState({ phase: "lobby", me: state.me })}
            >
              Back to Lobby
            </button>
          </div>
        );

      default:
        return null;
    }
  }, [state, boot, onBooted, onStart]);

  return <div>{content}</div>;
}
