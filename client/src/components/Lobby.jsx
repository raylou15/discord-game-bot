// src/components/Lobby.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import HelpModal from "./HelpModal.jsx";
import RolePreview from "./RolePreview.jsx";
import HostSettings from "./HostSettings.jsx";
import ChatDock from "./ChatDock.jsx";

const MIN_PLAYERS = 5;

function avatarUrl(p, me) {
  // Prefer avatar from player object
  if (p.avatar) {
    return `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png?size=64`;
  }
  // If this is me and my avatar is known
  if (p.id === me?.id && me?.avatar) {
    return `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`;
  }
  // Default fallback avatar
  const discrim = p.discriminator || me?.discriminator || "0";
  const idx = Number(discrim) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export default function Lobby({ me, state, api, wsConnected }) {
  const players = state?.players || [];
  const meEntry = players.find((p) => p.id === me?.id);
  const isHost = state?.hostId === me?.id;
  const everyoneReady = players.length > 0 && players.every((p) => p.ready);
  const meetsMinPlayers = players.length >= MIN_PLAYERS;

  const [helpOpen, setHelpOpen] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [count, setCount] = useState(3);
  const cdTimer = useRef(null);

  const canStart =
    isHost &&
    everyoneReady &&
    meetsMinPlayers &&
    wsConnected &&
    !state?.started &&
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
      api.startGame?.();
      setCountingDown(false);
      return;
    }
    cdTimer.current && clearTimeout(cdTimer.current);
    cdTimer.current = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(cdTimer.current);
  }, [countingDown, count, api]);

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

          <div className="panel players-panel">
            <h3>Players</h3>
            {players.length === 0 ? (
              <p className="muted">Waiting for others to join…</p>
            ) : (
              <div className="player-grid scroll-inner">
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
                      <div className="muted small">
                        {p.id === state?.hostId
                          ? "Host"
                          : p.ready
                          ? "Ready"
                          : "Not ready"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="panel action-bar">
            <button
              onClick={() => api.setReady(!meEntry?.ready)}
              disabled={!wsConnected || state?.started || countingDown}
            >
              {!wsConnected
                ? "Connecting…"
                : meEntry?.ready
                ? "Unready"
                : "Ready"}
            </button>
            <button disabled={!canStart} onClick={beginCountdown}>
              {countingDown ? "Starting…" : "Start Game"}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="right-col scroll-inner">
          <RolePreview playerCount={players.length} settings={state?.settings} />
          <HostSettings
            isHost={isHost}
            api={api}
            roomState={state}
            playerCount={players.length}
          />
        </div>
      </div>

      {/* HUD */}
      <ChatDock wsConnected={wsConnected} />

      {/* Countdown */}
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
