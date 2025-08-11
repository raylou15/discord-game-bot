// src/components/Lobby.jsx
export default function Lobby({ me, onStart, players = [] }) {
  return (
    <div>
      {/* Header panel */}
      <div className="panel" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        />
        <div>
          <h2>Werewolf Lobby</h2>
          <p>Signed in as <strong>{me?.global_name ?? me?.username ?? "…"}</strong></p>
        </div>
      </div>

      {/* Player list */}
      <div className="panel">
        <h3>Players in Room</h3>
        {players.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Waiting for others to join…</p>
        ) : (
          <div className="player-grid">
            {players.map((p) => (
              <div key={p.id} className="player-card">
                {p.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={onStart}>Start Game</button>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          style={{ backgroundColor: "#333" }}
        >
          Copy Invite
        </button>
      </div>
    </div>
  );
}
