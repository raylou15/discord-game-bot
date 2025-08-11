import { useEffect, useState } from "react";

export default function LoadingGate({
  loader,
  onLoaded,
  title = "Spinning up the room…",
  subtitle = "Talking to Discord",
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
      <div className="mx-auto max-w-md p-8 text-center">
        <h1>Couldn’t connect</h1>
        <p style={{ opacity: 0.8, marginTop: 8 }}>{String(error)}</p>
        <p style={{ opacity: 0.6, marginTop: 16, fontSize: 14 }}>
          Make sure you launched this inside Discord as an Activity.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <div
        className="animate-pulse"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          margin: "0 auto 16px",
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>{subtitle}</p>
      {/* Keep children mounted so you can preload assets if you like */}
      <div style={{ display: "none" }}>{children}</div>
    </div>
  );
}
