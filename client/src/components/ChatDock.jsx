// src/components/ChatDock.jsx
import { useState } from "react";

export default function ChatDock({ wsConnected }) {
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState([
    { id: 1, name: "System", text: "Welcome to Werewolf. Be civil. 🐺" },
  ]);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    // TODO: wire to your WS later
    setMsgs((m) => [...m, { id: Date.now(), name: "You", text: draft.trim() }]);
    setDraft("");
  }

  return (
    <>
      <div className="hud-bar">
        <button className="hud-btn" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide Chat" : "Show Chat"}
        </button>
        <div className={`conn-dot ${wsConnected ? "ok" : "bad"}`} title={wsConnected ? "Connected" : "Disconnected"} />
      </div>

      {open && (
        <div className="chat-dock">
          <div className="chat-scroll">
            {msgs.map((m) => (
              <div key={m.id} className="chat-line">
                <strong>{m.name}:</strong> <span>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              placeholder={wsConnected ? "Type a message…" : "Connecting…"}
              disabled={!wsConnected}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button onClick={send} disabled={!wsConnected || !draft.trim()}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
