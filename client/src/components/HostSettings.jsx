// src/components/HostSettings.jsx
import { useEffect, useMemo, useState } from "react";

const DEFAULTS = {
  roles: { seer: true, doctor: true, hunter: false, extraWolf: false },
  tieRule: "no-elim",
  dayTimerSec: 120,
};

export default function HostSettings({ isHost, api, roomState, playerCount }) {
  const initial = useMemo(() => ({ ...DEFAULTS, ...(roomState?.settings || {}) }), [roomState]);
  const [local, setLocal] = useState(initial);
  useEffect(() => setLocal(initial), [initial]);

  const locked = roomState?.started;
  const can = (unlock) => playerCount >= unlock;

  function patch(next) {
    setLocal(next);
    api.updateSettings?.(next);
  }

  return (
    <div className="panel">
      <div className="settings-row">
        <h3>Host Settings</h3>
        {!isHost && <span className="muted small">View only</span>}
      </div>

      <div className="settings-grid">
        <div>
          <h4>Roles</h4>
          {[
            ["seer", "Seer", 6],
            ["doctor", "Doctor", 7],
            ["hunter", "Hunter", 9],
            ["extraWolf", "Extra Wolf", 10],
          ].map(([key, label, unlock]) => (
            <label key={key} className="sw">
              <input
                type="checkbox"
                disabled={!isHost || locked || !can(unlock)}
                checked={!!local.roles[key]}
                onChange={(e) =>
                  patch({
                    ...local,
                    roles: { ...local.roles, [key]: e.target.checked },
                  })
                }
              />
              <span>
                {label} <em className="muted small">({unlock}+)</em>
              </span>
            </label>
          ))}
        </div>

        <div>
          <h4>Tie Rule</h4>
          <select
            disabled={!isHost || locked}
            value={local.tieRule}
            onChange={(e) => patch({ ...local, tieRule: e.target.value })}
          >
            <option value="no-elim">No elimination on tie</option>
            <option value="random">Random among tied</option>
            <option value="runoff">Runoff vote</option>
          </select>
        </div>

        <div>
          <h4>Day Timer</h4>
          <input
            type="number"
            min={30}
            max={600}
            step={30}
            disabled={!isHost || locked}
            value={local.dayTimerSec}
            onChange={(e) =>
              patch({
                ...local,
                dayTimerSec: Math.max(30, Math.min(600, Number(e.target.value) || 120)),
              })
            }
          />
          <p className="muted small">Seconds per Day</p>
        </div>
      </div>
    </div>
  );
}
