"use client";

import { useEffect, useState } from "react";

// Fond d'écran animé plein écran du Chill Mode.
// Monté uniquement quand le mode est actif (pour ne pas télécharger/jouer la vidéo
// en mode sérieux), avec un démontage différé pour laisser le fondu de sortie se jouer.
export function ChillBackground({ active }: { active: boolean }) {
  const [render, setRender] = useState(active);

  useEffect(() => {
    if (active) {
      setRender(true);
    } else {
      const t = setTimeout(() => setRender(false), 450); // = durée du fondu CSS
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!render) return null;

  return (
    <div className={`chill-bg ${active ? "is-visible" : ""}`} aria-hidden>
      <video autoPlay loop muted playsInline>
        {/* WEBM en priorité (plus léger), MP4 en repli pour Safari/iOS */}
        <source src="/videos/BG_DEFAULT.webm" type="video/webm" />
        <source src="/videos/BG_DEFAULT.mp4" type="video/mp4" />
      </video>
      <div className="chill-bg__scrim" />
    </div>
  );
}
