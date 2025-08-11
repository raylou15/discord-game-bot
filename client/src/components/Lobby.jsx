export default function Lobby({ me, state, api, wsConnected }) {
  const players = state?.players || [];
  const meEntry = players.find((p) => p.id === me?.id);
  const isHost = state?.hostId === me?.id;
  const everyoneReady = players.length > 0 && players.every((p) => p.ready);
  const canStart = isHost && everyoneReady;

  return (
    <div>
      {/* Header */}
      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(255,255,255,0.08)" }} />
        <div>
          <h2>Werewolf Lobby</h2>
          <p>
            Signed in as <strong>{me?.global_name ?? me?.username ?? "…"}</strong>
            {isHost ? " • Host" : ""} •{" "}
            <span style={{ opacity: 0.8 }}>
              {wsConnected ? "Connected" : "Connecting…"}
            </span>
          </p>
        </div>
      </div>

      {/* Players */}
      <div className="panel">
        <h3>Players in Room</h3>
        {players.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Waiting for others to join…</p>
        ) : (
          <div className="player-grid">
            {players.map((p) => (
              <div key={p.id} className="player-card">
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ opacity: 0.8, fontSize: 13 }}>
                  {p.id === state?.hostId ? "Host" : p.ready ? "Ready" : "Not ready"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => api.setReady(!meEntry?.ready)} disabled={!wsConnected}>
          {!wsConnected ? "Connecting…" : meEntry?.ready ? "Unready" : "Ready"}
        </button>
        <button disabled={!canStart || !wsConnected} onClick={() => api.startGame()}>
          Start Game
        </button>
      </div>
    </div>
  );
}
