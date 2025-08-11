// src/components/TipCarousel.jsx
import { useEffect, useRef, useState } from "react";

export default function TipCarousel({ tips = [], intervalMs = 2600 }) {
  const [i, setI] = useState(0);
  const timer = useRef();

  useEffect(() => {
    clearInterval(timer.current);
    if (tips.length <= 1) return;
    timer.current = setInterval(() => {
      setI((v) => (v + 1) % tips.length);
    }, intervalMs);
    return () => clearInterval(timer.current);
  }, [tips, intervalMs]);

  if (!tips.length) return null;

  return (
    <div className="tip-carousel">
      <div className="tip-dotbar">
        {tips.map((_, idx) => (
          <span key={idx} className={`dot ${idx === i ? "active" : ""}`} />
        ))}
      </div>
      <div className="tip-line" aria-live="polite">{tips[i]}</div>
    </div>
  );
}
