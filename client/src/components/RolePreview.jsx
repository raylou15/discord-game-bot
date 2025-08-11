// src/components/RolePreview.jsx

function unlockedByCount(players) {
  // baseline: 1 wolf at 5+; extra wolf unlock at 10+
  const base = ["Werewolf", "Villager"];
  const add = [];
  if (players >= 6) add.push("Seer");
  if (players >= 7) add.push("Doctor");
  if (players >= 9) add.push("Hunter");
  return { base, add, extraWolfUnlocked: players >= 10 };
}

export default function RolePreview({ playerCount, settings }) {
  const u = unlockedByCount(playerCount);
  const enabled = {
    Seer: settings?.roles?.seer && playerCount >= 6,
    Doctor: settings?.roles?.doctor && playerCount >= 7,
    Hunter: settings?.roles?.hunter && playerCount >= 9,
    ExtraWolf: settings?.roles?.extraWolf && u.extraWolfUnlocked,
  };

  const chips = [
    { name: "Werewolf", kind: "evil", on: true },
    { name: "Villager", kind: "good", on: true },
    { name: "Seer", kind: "good", on: enabled.Seer },
    { name: "Doctor", kind: "good", on: enabled.Doctor },
    { name: "Hunter", kind: "good", on: enabled.Hunter },
    { name: "Extra Werewolf", kind: "evil", on: enabled.ExtraWolf },
  ];

  return (
    <div className="panel">
      <h3>Roles This Game</h3>
      <p className="muted small" style={{ marginBottom: 8 }}>
        Roles unlock as more players join. Host can toggle optional roles once unlocked.
      </p>
      <div className="role-chip-row">
        {chips.map((c) => (
          <span key={c.name} className={`role-chip ${c.kind} ${c.on ? "on" : "off"}`} title={c.on ? "Enabled" : "Locked/Off"}>
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
