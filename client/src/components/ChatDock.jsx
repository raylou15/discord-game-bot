// src/components/ChatDock.jsx
import { useEffect, useRef } from "react";

export default function ChatDock({ open, onOpenChange, wsConnected, messages = [], onSend }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  if (!open) return null;

  return (
    <div className="chat-dock">
      <div className="chat-scroll">
        {messages.map((m) => (
          <div key={m.id} className="chat-line">
            <strong>{m.name}:</strong> <span>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {/* Input removed on purpose since we're mirroring VC chat (see #4) */}
      <div className="chat-input-row">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    </div>
  );
}
