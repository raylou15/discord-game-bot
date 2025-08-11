// src/components/LoadingGate.jsx
import { useEffect, useState } from "react";

export default function LoadingGate({
  loader,
  onLoaded,
  title = "Connecting to Discord…",
  subtitle = "Please wait while we set things up",
  children,
}) {
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    loader()
      .then((v) => {
        if (mounted) onLoaded(v);
      })
      .catch((e) => setError(e?.message ?? "Something went wrong"));
    return () => {
      mounted = false;
    };
  }, [loader, onLoaded]);

  if (error) {
    return (
      <div className="panel" style={{ textAlign: "center" }}>
        <h2>Couldn’t connect</h2>
        <p style={{ opacity: 0.8, marginTop: "8px" }}>{error}</p>
        <p style={{ opacity: 0.6, marginTop: "16px", fontSize: "14px" }}>
          Make sure you launched this inside Discord as an Activity.
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 16px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          animation: "pulse 1.5s infinite",
        }}
      />
      <h2>{title}</h2>
      <p style={{ opacity: 0.8, marginTop: "6px" }}>{subtitle}</p>
      {/* Keep children mounted for preloading */}
      <div style={{ display: "none" }}>{children}</div>
    </div>
  );
}
