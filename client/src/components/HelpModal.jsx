// src/components/HelpModal.jsx
import { useEffect } from "react";

export default function HelpModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>How to Play — Werewolf</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <section>
            <h4>Goal</h4>
            <p>Villagers eliminate all Werewolves. Werewolves reach parity (wolves ≥ villagers).</p>
          </section>

          <section>
            <h4>Phases</h4>
            <ul className="bullets">
              <li><strong>Night:</strong> Wolves choose a victim; Seer peeks; Doctor protects; Hunter has no night action.</li>
              <li><strong>Day:</strong> Discuss and vote. Tie rule is set by the Host (no‑elim / random / runoff).</li>
            </ul>
          </section>

          <section>
            <h4>Roles</h4>
            <ul className="roles">
              <li><span className="role-chip evil">Werewolf</span> – Eliminates 1 player each night. Wins at parity.</li>
              <li><span className="role-chip good">Villager</span> – No night action. Wins by voting out wolves.</li>
              <li><span className="role-chip good">Seer</span> – Learns if a player is wolf or not each night. (6+ players)</li>
              <li><span className="role-chip good">Doctor</span> – Protects one player from the night kill. (7+ players)</li>
              <li><span className="role-chip good">Hunter</span> – On elimination, chooses someone to eliminate. (9+ players)</li>
              <li><span className="role-chip evil">Extra Wolf</span> – Additional wolf at high player counts. (10+ players)</li>
            </ul>
          </section>

          <section>
            <h4>Setup</h4>
            <ul className="bullets">
              <li>Minimum 5 players. Roles unlock automatically as the lobby grows.</li>
              <li>The Host can toggle optional roles (once unlocked), set tie rule, and a day timer.</li>
              <li>Everyone clicks <em>Ready</em> → Host hits <em>Start</em> → 3‑second countdown → Game begins.</li>
            </ul>
          </section>

          <section>
            <h4>Tips</h4>
            <ul className="bullets">
              <li>Vote history matters. Wolves often avoid leading wagons.</li>
              <li>Seer claims should be timed—too early paints a target.</li>
              <li>Doctors: predicting the night kill is the name of the game.</li>
            </ul>
          </section>
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
