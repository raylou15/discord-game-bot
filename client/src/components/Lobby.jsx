// src/components/Lobby.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import HostSettings from "./HostSettings.jsx";
import RolePreview from "./RolePreview.jsx";

const MIN_PLAYERS = 5;

export default function Lobby({ me, state, api, wsConnected }) {
  const [countingDown, setCountingDown] = useState(false);
  const [count, setCount] = useState(3);
  const cdTimer = useRef(null);

  const players = state?.players || [];
  const meEntry = players.find((p) => p.id === me?.id);
  const isHost = state?.hostId === me?.id;
  const everyoneReady = players.length > 0 && players.every((p) => p.ready);
  const meetsMinPlayers = players.length >= MIN_PLAYERS;
  const canStart = isHost && everyoneReady && meetsMinPlayers && wsConnected && !state?.started && !countingDown;

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

  // manage the 3..2..1.. Start flow
  useEffect(() => {
    if (!countingDown) return;
    if (count <= 0) {
      // fire start, lock UI
      api.startGame?.();
      setCountingDown(false);
      return;
    }
    cdTimer.current && clearTimeout(cdTimer.current);
    cdTimer.current = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(cdTimer.current);
  }, [countingDown, count, api]);

  return (
    <div>
      {/* Header */}
      <div className="panel lobby-header">
        <div className="avatar-placeholder" />
        <div className="lobby-header-main">
          <h2>Werewolf Lobby</h2>
          <p className="muted">{statusLine}</p>
        </div>
        <div className="lobby-header-actions">
          {/* Reserve space for future Help button if you add it here */}
        </div>
      </div>

      {/* Start requirements */}
      <div className="panel">
        <div className="reqs">
          <span className={`req-chip ${meetsMinPlayers ? "ok" : "warn"}`}>
            {meetsMinPlayers ? "✓" : "•"} Min Players: {MIN_PLAYERS}
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

      {/* Role preview */}
      <RolePreview playerCount={players.length} settings={state?.settings} />

      {/* Host settings (view-only for non-hosts) */}
      <HostSettings
        isHost={isHost}
        api={api}
        roomState={state}
        playerCount={players.length}
      />

      {/* Players */}
      <div className="panel">
        <h3>Players in Room</h3>
        {players.length === 0 ? (
          <p className="muted">Waiting for others to join…</p>
        ) : (
          <div className="player-grid">
            {players.map((p) => (
              <div key={p.id} className="player-card">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                <div className="muted small">
                  {p.id === state?.hostId ? "Host" : p.ready ? "Ready" : "Not ready"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="actions-row">
        <button onClick={() => api.setReady(!meEntry?.ready)} disabled={!wsConnected || state?.started || countingDown}>
          {!wsConnected ? "Connecting…" : meEntry?.ready ? "Unready" : "Ready"}
        </button>

        <button
          disabled={!canStart}
          title={
            canStart
              ? "Start the game"
              : "You must be the host, have 5+ players, everyone ready, and be connected."
          }
          onClick={beginCountdown}
        >
          {countingDown ? `Starting…` : "Start Game"}
        </button>
      </div>

      {/* Countdown overlay */}
      {countingDown && (
        <div className="countdown-overlay">
          <div className="countdown-card">
            <div className="count-num" aria-live="assertive">{count}</div>
            <div className="muted">Locking lobby…</div>
          </div>
        </div>
      )}
    </div>
  );
}
