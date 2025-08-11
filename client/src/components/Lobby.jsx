// src/components/Lobby.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import HelpModal from "./HelpModal.jsx";
import RolePreview from "./RolePreview.jsx";
import HostSettings from "./HostSettings.jsx";

const MIN_PLAYERS = 5;

function avatarUrl(p) {
  if (p.avatar) {
    return `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png?size=64`;
  }
  const idx = Number(p.discriminator || 0) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

/**
 * Props:
 * - me: current user object
 * - state: presence/lobby state from connectPresence()  ➜ renamed to presenceState
 * - presence: presence API (setReady, startGame, setSettings, addBots, etc.)
 * - wsConnected: boolean for presence socket
 * - onJoin(roomId, id, name): callback from App to open game WS
 */
export default function Lobby({ me, state: presenceState, presence, wsConnected, onJoin }) {
  const players = presenceState?.players || [];
  const meEntry = players.find((p) => p.id === me?.id);
  const isHost = presenceState?.hostId === me?.id;
  const everyoneReady = players.length > 0 && players.every((p) => p.ready);
  const meetsMinPlayers = players.length >= MIN_PLAYERS;

  // Local UI state
  const [helpOpen, setHelpOpen] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [count, setCount] = useState(3);
  const cdTimer = useRef(null);

  // Track if we've called onJoin() already to avoid duplicates
  const joinedRef = useRef(false);

  // When presence connection is up and we know the room & me, notify App to open game WS
  useEffect(() => {
    const roomId = presenceState?.roomId || presenceState?.id || presenceState?.room;
    const readyToJoin = wsConnected && !!roomId && !!me?.id && typeof onJoin === "function";
    if (readyToJoin && !joinedRef.current) {
      joinedRef.current = true;
      onJoin(roomId, me.id, me.username || me.global_name || me.name || `Player-${me.id.slice(0, 4)}`);
    }
  }, [wsConnected, presenceState, me, onJoin]);

  const canStart =
    isHost &&
    everyoneReady &&
    meetsMinPlayers &&
    wsConnected &&
    !presenceState?.started &&
    !countingDown;

  const statusLine = useMemo(() => {
    const bits = [];
    bits.push(wsConnected ? "Connected" : "Connecting…");
    if (isHost) bits.push("Host");
    bits.push(`${players.length} player${players.length === 1 ? "" : "s"}`);
    return bits.join(" • ");
  }, [wsConnected, isHost, players.length]);

  function beginCountdown() {
    if (!canStart) return;
    setCountingDown(true);
    setCount(3);
  }

  useEffect(() => {
    if (!countingDown) return;
    if (count <= 0) {
      presence.startGame?.();
      setCountingDown(false);
      return;
    }
    cdTimer.current && clearTimeout(cdTimer.current);
    cdTimer.current = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(cdTimer.current);
  }, [countingDown, count, presence]);

  return (
    <div className="viewport">
      {/* Top bar */}
      <div className="topbar">
        <div className="brand">Werewolf</div>
        <div className="topbar-center muted">{statusLine}</div>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => setHelpOpen(true)}>
            Help
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="main-grid">
        {/* Left column */}
        <div className="left-col">
          <div className="panel">
            <h3>Lobby</h3>
            <div className="reqs">
              <span className={`req-chip ${meetsMinPlayers ? "ok" : "warn"}`}>
                {meetsMinPlayers ? "✓" : "•"} Min: {MIN_PLAYERS}
              </span>
              <span className={`req-chip ${everyoneReady ? "ok" : "warn"}`}>
                {everyoneReady ? "✓" : "•"} Everyone Ready
              </span>
              <span className={`req-chip ${wsConnected ? "ok" : "warn"}`}>
                {wsConnected ? "✓" : "•"} Server Connection
              </span>
              <span className={`req-chip ${isHost ? "ok" : "warn"}`}>
                {isHost ? "✓" : "•"} Host Present
              </span>
            </div>
          </div>

          <div className="panel players-panel scroll-inner">
            <h3>Players</h3>
            {players.length === 0 ? (
              <p className="muted">Waiting for others to join…</p>
            ) : (
              <div className="player-grid">
                {players.map((p) => (
                  <div key={p.id} className="player-card">
                    <img
                      className="player-avatar"
                      src={avatarUrl(p)}
                      alt={p.name}
                      draggable={false}
                    />
                    <div className="player-info">
                      <strong>{p.name}</strong>
                      <div className={`ready-indicator ${p.ready ? "ready" : "not-ready"}`}>
                        {p.ready ? "✅ Ready" : "❌ Not ready"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fixed button bar */}
          <div className="panel action-bar">
            {isHost && me?.id === "178689418415177729" && (
              <button
                className="secondary"
                onClick={() => presence.addBots?.(6)}
              >
                Add 6 Bots 🤖
              </button>
            )}

            <button
              className="primary"
              onClick={() => presence.setReady?.(!meEntry?.ready)}
            >
              {meEntry?.ready ? "Unready" : "Ready"}
            </button>
            <button disabled={!canStart} onClick={beginCountdown}>
              {countingDown ? "Starting…" : "Start Game"}
            </button>
            {import.meta.env.DEV &&
              presenceState?.me?.id === "178689418415177729" &&
              isHost && (
                <button
                  className="secondary"
                  onClick={async () => {
                    const roomId = presenceState?.roomId || presenceState?.id || presenceState?.room;
                    await fetch("/api/dev/bots", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ roomId, count: 6 })
                    });
                  }}
                >
                  Add 6 Bots 🤖
                </button>
              )}
          </div>
        </div>

        {/* Right column */}
        <div className="right-col scroll-inner">
          <RolePreview playerCount={players.length} settings={presenceState?.settings} />
          <HostSettings
            isHost={isHost}
            api={presence}
            roomState={presenceState}
            playerCount={players.length}
          />
        </div>
      </div>

      {countingDown && (
        <div className="countdown-overlay">
          <div className="countdown-card">
            <div className="count-num">{count}</div>
            <div className="muted">Locking lobby…</div>
          </div>
        </div>
      )}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
