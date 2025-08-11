// src/components/HostSettings.jsx
import { useEffect, useMemo, useState } from "react";

/** sensible defaults */
const DEFAULTS = {
  roles: {
    seer: true,
    doctor: true,
    hunter: false,
    extraWolf: false,
  },
  tieRule: "no-elim", // "no-elim" | "random" | "runoff"
  dayTimerSec: 120,   // 2 minutes
};

export default function HostSettings({ isHost, api, roomState, playerCount }) {
  // read from server state if present, else fall back
  const initial = useMemo(() => ({ ...DEFAULTS, ...(roomState?.settings || {}) }), [roomState]);
  const [local, setLocal] = useState(initial);

  // sync when roomState.settings changes
  useEffect(() => setLocal(initial), [initial]);

  function patch(p) {
    const next = typeof p === "function" ? p(local) : p;
    setLocal(next);
    api.updateSettings?.(next);
  }

  // lock timers/roles if game started
  const locked = roomState?.started;

  return (
    <div className="panel">
      <div className="settings-row">
        <h3 style={{ marginBottom: 6 }}>Host Settings</h3>
        {!isHost && <span className="muted small">View only — host controls</span>}
      </div>

      <div className="settings-grid">
        {/* Roles */}
        <div>
          <h4>Roles</h4>
          <label className="sw">
            <input
              type="checkbox"
              disabled={!isHost || locked || playerCount < 6}
              checked={!!local.roles.seer}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, seer: e.target.checked } })}
            />
            <span>Seer <em className="muted small">(unlocks at 6+)</em></span>
          </label>

          <label className="sw">
            <input
              type="checkbox"
              disabled={!isHost || locked || playerCount < 7}
              checked={!!local.roles.doctor}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, doctor: e.target.checked } })}
            />
            <span>Doctor <em className="muted small">(unlocks at 7+)</em></span>
          </label>

          <label className="sw">
            <input
              type="checkbox"
              disabled={!isHost || locked || playerCount < 9}
              checked={!!local.roles.hunter}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, hunter: e.target.checked } })}
            />
            <span>Hunter <em className="muted small">(unlocks at 9+)</em></span>
          </label>

          <label className="sw">
            <input
              type="checkbox"
              disabled={!isHost || locked || playerCount < 10}
              checked={!!local.roles.extraWolf}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, extraWolf: e.target.checked } })}
            />
            <span>Extra Werewolf <em className="muted small">(unlocks at 10+)</em></span>
          </label>
        </div>

        {/* Tie rule */}
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
          <p className="muted small" style={{ marginTop: 6 }}>
            Applied during Day lynch resolution.
          </p>
        </div>

        {/* Day timer */}
        <div>
          <h4>Day Timer</h4>
          <input
            type="number"
            min={30}
            max={600}
            step={30}
            disabled={!isHost || locked}
            value={local.dayTimerSec}
            onChange={(e) => patch({ ...local, dayTimerSec: Math.max(30, Math.min(600, Number(e.target.value) || 120)) })}
          />
          <p className="muted small" style={{ marginTop: 6 }}>
            Seconds per Day (discussion + voting).
          </p>
        </div>
      </div>
    </div>
  );
}
