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
          <button className="icon-btn" onClick={onClose} aria-label="Close help">✕</button>
        </div>

        <div className="modal-body">
          <section>
            <h4>Goal</h4>
            <p>
              Villagers win by identifying and eliminating all Werewolves.
              Werewolves win by reducing the village to parity (wolves ≥ villagers).
            </p>
          </section>

          <section>
            <h4>Phases</h4>
            <ul className="bullets">
              <li><strong>Night:</strong> Secret actions resolve. Werewolves choose a target. Special roles (Seer/Doctor/Hunter) act if present.</li>
              <li><strong>Day:</strong> Players discuss and vote. The player with the most votes is eliminated (ties can be no-elimination or a runoff, depending on settings).</li>
            </ul>
          </section>

          <section>
            <h4>Common Roles</h4>
            <ul className="roles">
              <li><span className="role-chip evil">Werewolf</span> – Eliminates 1 player each night.</li>
              <li><span className="role-chip good">Villager</span> – No night action; uses deduction and voting.</li>
              <li><span className="role-chip good">Seer</span> – Learns if a player is 🐺 or not each night.</li>
              <li><span className="role-chip good">Doctor</span> – Protects a player from elimination each night.</li>
              <li><span className="role-chip good">Hunter</span> – On elimination, takes someone down with them.</li>
            </ul>
          </section>

          <section>
            <h4>Setup & Start</h4>
            <ul className="bullets">
              <li>Minimum 5 players recommended. Roles unlock progressively as the lobby grows.</li>
              <li>Everyone must click <em>Ready</em>. The host can then press <em>Start Game</em>.</li>
            </ul>
          </section>

          <section>
            <h4>Tips</h4>
            <ul className="bullets">
              <li>As Villagers: look for contradictions, voting patterns, and night outcomes.</li>
              <li>As Wolves: blend in, sow doubt, and avoid obvious collusion.</li>
              <li>Silence can be telling. So can “too-perfect” arguments.</li>
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
