// src/components/LoadingGate.jsx
import { useEffect, useState } from "react";
import TipCarousel from "./TipCarousel.jsx";
import ArtBanner from "./ArtBanner.jsx";

const DEFAULT_TIPS = [
  "Tip: Wolves win at parity. Count carefully.",
  "Tip: Seer results are powerful—protect your Seer.",
  "Tip: Wolves, avoid voting in a pack.",
  "Tip: Hunters take someone with them on elimination.",
  "Tip: Doctors can self-protect only if house rules allow.",
];

export default function LoadingGate({
  loader,
  onLoaded,
  title = "Connecting to Discord…",
  subtitle = "Preparing your lobby",
  tips = DEFAULT_TIPS,
  children,
}) {
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    loader()
      .then((v) => mounted && onLoaded(v))
      .catch((e) => setError(e?.message ?? "Something went wrong"));
    return () => { mounted = false; };
  }, [loader, onLoaded]);

  if (error) {
    return (
      <div>
        <ArtBanner title="Connection Issue" subtitle="We couldn’t reach Discord" />
        <div className="panel" style={{ textAlign: "center" }}>
          <h2>Couldn’t connect</h2>
          <p style={{ opacity: 0.8, marginTop: 8 }}>{error}</p>
          <p className="muted">
            Make sure you launched this inside Discord as an Activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ArtBanner />
      <div className="panel" style={{ textAlign: "center" }}>
        <div className="loader-ring" aria-hidden />
        <h2>{title}</h2>
        <p style={{ opacity: 0.8, marginTop: 6 }}>{subtitle}</p>
        <TipCarousel tips={tips} />
        {/* Keep children mounted for preloading */}
        <div style={{ display: "none" }}>{children}</div>
      </div>
    </div>
  );
}
