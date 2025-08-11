// src/components/ArtBanner.jsx
export default function ArtBanner({ title = "Werewolf", subtitle = "Trust no one." }) {
  return (
    <div className="art-banner">
      <div className="art-fg">
        <h1 className="game-title">{title}</h1>
        <p className="game-subtitle">{subtitle}</p>
      </div>
      <div className="art-overlay" />
    </div>
  );
}
