// src/components/RolePreview.jsx
const ROLE_INFO = [
  { name: "Werewolf", kind: "evil", unlock: 5, always: true,
    blurb: "Eliminates one player each night. Wins at parity." },
  { name: "Villager", kind: "good", unlock: 5, always: true,
    blurb: "No night power. Use discussion and votes to find wolves." },
  { name: "Seer", kind: "good", unlock: 6, key: "seer",
    blurb: "Peek one player each night to learn wolf / not‑wolf." },
  { name: "Doctor", kind: "good", unlock: 7, key: "doctor",
    blurb: "Protect one player from the night kill." },
  { name: "Hunter", kind: "good", unlock: 9, key: "hunter",
    blurb: "On elimination, immediately choose someone to eliminate." },
  { name: "Extra Werewolf", kind: "evil", unlock: 10, key: "extraWolf",
    blurb: "Adds another wolf for larger lobbies." },
];

export default function RolePreview({ playerCount, settings }) {
  return (
    <div className="panel">
      <h3>Roles This Game</h3>
      <div className="role-card-grid">
        {ROLE_INFO.map((r) => {
          const unlocked = playerCount >= r.unlock;
          const enabled = r.always || (!!settings?.roles?.[r.key] && unlocked);
          return (
            <div key={r.name} className={`role-card ${r.kind} ${enabled ? "on" : "off"}`} title={!unlocked ? `Unlocks at ${r.unlock}+ players` : ""}>
              <div className="role-card-header">
                <span className="role-name">{r.name}</span>
                <span className="role-badge">{r.kind === "evil" ? "Evil" : "Good"}</span>
              </div>
              <div className="role-card-blurb">{r.blurb}</div>
              <div className="role-card-foot">{r.always ? "Always in" : unlocked ? (enabled ? "Enabled" : "Disabled") : `Unlocks at ${r.unlock}+`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
