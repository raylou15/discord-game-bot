// client/src/components/GameBoard.jsx
import { useEffect, useMemo, useState } from "react";
import { onMessage, send } from "../sdk/ws";

// Helper: pretty name with (You) tag
function nameWithYou(p, selfId) {
  return p.id === selfId ? `${p.name} (You)` : p.name;
}

// Helper: tally votes map -> { targetId: count }
function tallyVotes(votes = {}) {
  const t = new Map();
  for (const [, target] of Object.entries(votes)) {
    if (!target) continue;
    t.set(target, (t.get(target) || 0) + 1);
  }
  return t;
}

export default function GameBoard({ state }) {
  const [local, setLocal] = useState(state);
  const [timeLeft, setTimeLeft] = useState(null); // seconds or null

  // keep local in sync with upstream state
  useEffect(() => setLocal(state), [state]);

  // subscribe to WS state
  useEffect(() => {
    const off = onMessage((m) => {
      if (m.type === "state") setLocal(m.state);
    });
    return () => off && off();
  }, []);

  // optional phase timer (only shows if server sets phaseEndsAt)
  useEffect(() => {
    if (!local?.phaseEndsAt) {
      setTimeLeft(null);
      return;
    }
    const calc = () =>
      setTimeLeft(Math.max(0, Math.floor((local.phaseEndsAt - Date.now()) / 1000)));
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [local?.phaseEndsAt]);

  if (!local) return null;

  const { phase, day, players, me: self, winner, hostId, history, votes } = local;
  const selfId = self?.id || "";
  const isHost = hostId === selfId;

  const aliveSet = useMemo(() => new Set(local.aliveIds || []), [local.aliveIds]);
  const alivePlayers = useMemo(() => players.filter(p => aliveSet.has(p.id)), [players, aliveSet]);
  const deadPlayers  = useMemo(() => players.filter(p => !aliveSet.has(p.id)), [players, aliveSet]);

  const myVote = votes && votes[selfId] ? votes[selfId] : null;
  const voteTally = useMemo(() => (phase === "DAY" ? tallyVotes(votes) : new Map()), [phase, votes]);

  return (
    <div className="game-board">
      {/* Header / status */}
      <header className="board-head">
        <div>
          <strong>Phase:</strong> {phase}{phase === "DAY" ? ` (Day ${day})` : ""}
          {timeLeft !== null && <span className="phase-timer"> — {timeLeft}s</span>}
        </div>

        {winner && <div className="winner">🏆 Winner: {winner}</div>}

        {self?.role && phase !== "ENDED" && (
          <div className="role-badge">Your Role: <strong>{self.role}</strong></div>
        )}

        <div className="host-controls">
          {phase === "LOBBY" && isHost && (
            <button className="primary" onClick={() => send("start")}>Start Game</button>
          )}
          {phase === "ENDED" && isHost && (
            <button onClick={() => send("reset")}>Reset Game</button>
          )}
        </div>
      </header>

      {/* Two-column main area on larger screens (falls back to stacked on mobile via CSS) */}
      <section className="players">
        <h3>Alive</h3>
        <ul>
          {alivePlayers.map(p => (
            <li key={p.id} className={p.id === selfId ? "you" : ""}>
              {nameWithYou(p, selfId)}
              {phase === "DAY" && voteTally.get(p.id) ? (
                <span style={{ opacity: 0.8, marginLeft: 8 }}>
                  · {voteTally.get(p.id)} vote{voteTally.get(p.id) > 1 ? "s" : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <h3>Fallen</h3>
        <ul>
          {deadPlayers.map(p => (
            <li key={p.id}>
              {p.name}{phase === "ENDED" && p.role ? ` — ${p.role}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="action-panel">
        {phase === "LOBBY" && <LobbyPanel />}
        {phase === "NIGHT" && (
          <NightPanel state={local} selfId={selfId} />
        )}
        {phase === "DAY" && (
          <DayPanel
            state={local}
            selfId={selfId}
            myVote={myVote}
            voteTally={voteTally}
          />
        )}
        {phase === "ENDED" && <HistoryPanel history={history} />}
      </section>
    </div>
  );
}

/* ---------------- LOBBY ---------------- */

function LobbyPanel() {
  return (
    <div className="panel lobby">
      <h3>Lobby</h3>
      <p className="muted">Waiting for the host to start. You can toggle ready in the lobby screen.</p>
      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => send("toggleReady", { ready: true })}>Ready</button>
        <button onClick={() => send("toggleReady", { ready: false })}>Unready</button>
      </div>
    </div>
  );
}

/* ---------------- NIGHT ---------------- */

function NightPanel({ state, selfId }) {
  const self = state.me;
  if (!self) return null;

  const acts = ["Werewolf", "Seer", "Doctor"];
  const canAct = acts.includes(self.role);

  const aliveSet = new Set(state.aliveIds || []);
  // you can’t target yourself at night
  const targets = state.players.filter(p => aliveSet.has(p.id) && p.id !== selfId);

  if (!canAct) {
    return (
      <div className="panel night">
        <h3>🌙 Night</h3>
        <p>You have no night action. Stay quiet and await dawn…</p>
      </div>
    );
  }

  return (
    <div className="panel night">
      <h3>🌙 Night Action — {self.role}</h3>
      {self.role === "Seer" && state.mySecrets?.lastSeen && (
        <p className="seer-info" style={{ marginBottom: 8 }}>
          Last inspection: {state.mySecrets.lastSeen.isWolf ? "🐺 WOLF" : "🙂 Not a Wolf"}
        </p>
      )}

      <p className="muted" style={{ marginBottom: 8 }}>
        Choose a target. Your action locks in immediately.
      </p>

      <div className="targets">
        {targets.map(t => (
          <button key={t.id} onClick={() => send("nightAction", { targetId: t.id })}>
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- DAY ---------------- */

function DayPanel({ state, selfId, myVote, voteTally }) {
  const aliveSet = new Set(state.aliveIds || []);
  const targets = state.players.filter(p => aliveSet.has(p.id));

  // sort by votes desc for readability
  const orderedTargets = [...targets].sort((a, b) => (voteTally.get(b.id) || 0) - (voteTally.get(a.id) || 0));

  return (
    <div className="panel day">
      <h3>☀️ Day Vote</h3>
      <p className="muted" style={{ marginBottom: 8 }}>
        Discuss and vote for a suspect. You can change your vote any time until everyone has voted.
      </p>

      <div className="targets">
        {orderedTargets.map(t => {
          const count = voteTally.get(t.id) || 0;
          const isMine = myVote === t.id;
          return (
            <button
              key={t.id}
              onClick={() => send("vote", { targetId: t.id })}
              title={isMine ? "You voted here" : "Vote for " + t.name}
              style={isMine ? { outline: "2px solid var(--accent-color)" } : null}
            >
              {count > 0 ? `Vote ${t.name} (${count})` : `Vote ${t.name}`}
            </button>
          );
        })}
        <button
          onClick={() => send("vote", { targetId: null })}
          title="Abstain"
          style={myVote === null ? { outline: "2px solid var(--accent-color)" } : null}
        >
          Abstain
        </button>
      </div>
    </div>
  );
}

/* ---------------- HISTORY ---------------- */

function HistoryPanel({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="panel history">
        <h3>📜 Game History</h3>
        <p className="muted">No events recorded.</p>
      </div>
    );
  }
  return (
    <div className="panel history">
      <h3>📜 Game History</h3>
      <ul style={{ marginTop: 8, paddingLeft: 18 }}>
        {history.map((h, idx) => (
          <li key={idx} style={{ marginBottom: 6 }}>
            {h.type === "night" && (
              <>
                🌙 Night:{" "}
                {h.deaths?.length
                  ? `${h.deaths.map(d => `${d.name} (${d.role})`).join(", ")} died`
                  : "No one died"}
              </>
            )}
            {h.type === "day" && (
              <>
                ☀️ Day:{" "}
                {h.lynched
                  ? `${h.lynched.name} (${h.lynched.role}) was lynched`
                  : h.tie
                  ? "Vote tied — no lynch"
                  : "No lynch"}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
