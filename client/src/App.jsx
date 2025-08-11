import { useCallback, useMemo, useState } from "react";
import LoadingGate from "./components/LoadingGate.jsx";
import Lobby from "./components/Lobby.jsx";
import { initDiscord } from "./sdk/discord.js";

export default function App() {
  const [state, setState] = useState({ phase: "boot", me: undefined });

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
        return <LoadingGate loader={boot} onLoaded={onBooted} />;
      case "lobby":
        return <Lobby me={state.me} onStart={onStart} />;
      case "game":
        return <div className="p-6">Game scene goes here.</div>;
      default:
        return null;
    }
  }, [state, boot, onBooted, onStart]);

  return <div>{content}</div>;
}
