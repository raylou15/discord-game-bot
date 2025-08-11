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
        {!isHost && <span className="muted small">View only — host controls</span>}
      </div>

      <div className="settings-grid">
        <div>
          <h4>Roles</h4>
          <label className="sw">
            <input type="checkbox" disabled={!isHost || locked || !can(6)}
              checked={!!local.roles.seer}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, seer: e.target.checked } })}/>
            <span>Seer <em className="muted small">(6+)</em></span>
          </label>
          <label className="sw">
            <input type="checkbox" disabled={!isHost || locked || !can(7)}
              checked={!!local.roles.doctor}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, doctor: e.target.checked } })}/>
            <span>Doctor <em className="muted small">(7+)</em></span>
          </label>
          <label className="sw">
            <input type="checkbox" disabled={!isHost || locked || !can(9)}
              checked={!!local.roles.hunter}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, hunter: e.target.checked } })}/>
            <span>Hunter <em className="muted small">(9+)</em></span>
          </label>
          <label className="sw">
            <input type="checkbox" disabled={!isHost || locked || !can(10)}
              checked={!!local.roles.extraWolf}
              onChange={(e) => patch({ ...local, roles: { ...local.roles, extraWolf: e.target.checked } })}/>
            <span>Extra Wolf <em className="muted small">(10+)</em></span>
          </label>
        </div>

        <div>
          <h4>Tie Rule</h4>
          <select disabled={!isHost || locked}
            value={local.tieRule}
            onChange={(e) => patch({ ...local, tieRule: e.target.value })}>
            <option value="no-elim">No elimination on tie</option>
            <option value="random">Random among tied</option>
            <option value="runoff">Runoff vote</option>
          </select>
          <p className="muted small" style={{ marginTop: 6 }}>Applied during Day lynch resolution.</p>
        </div>

        <div>
          <h4>Day Timer</h4>
          <input type="number" min={30} max={600} step={30}
            disabled={!isHost || locked}
            value={local.dayTimerSec}
            onChange={(e) => {
              const v = Math.max(30, Math.min(600, Number(e.target.value) || 120));
              patch({ ...local, dayTimerSec: v });
            }}/>
          <p className="muted small" style={{ marginTop: 6 }}>Seconds per Day (discussion + voting).</p>
        </div>
      </div>
    </div>
  );
}
