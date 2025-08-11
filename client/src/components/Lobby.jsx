export default function Lobby({ me, onStart, players = [] }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Werewolf (Lobby)</div>
          <div style={{ opacity: 0.7, fontSize: 14 }}>
            Signed in as <strong>{me?.global_name ?? me?.username ?? "…"}</strong>
          </div>
        </div>
      </header>

      <section style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8, opacity: 0.9 }}>
          Players in room
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 8,
          }}
        >
          {players.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Waiting for others to join…</div>
          ) : (
            players.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                {p.name}
              </div>
            ))
          )}
        </div>
      </section>

      <footer style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <button
          onClick={onStart}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Start Game
        </button>
        <button
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            opacity: 0.8,
            cursor: "pointer",
          }}
          onClick={() => navigator.clipboard.writeText(window.location.href)}
        >
          Copy Invite
        </button>
      </footer>
    </div>
  );
}
