"use client";

import { useEffect, useState } from "react";

// Fond d'écran animé plein écran du Chill Mode.
// Monté uniquement quand le mode est actif (pour ne pas télécharger/jouer la vidéo
// en mode sérieux), avec un démontage différé pour laisser le fondu de sortie se jouer.
export function ChillBackground({ active }: { active: boolean }) {
  const [render, setRender] = useState(active);
  // `visible` pilote la classe is-visible. On le passe à true *après* le montage
  // (double rAF) pour que la transition opacity 0 → 1 se déclenche aussi à l'entrée
  // (sinon l'élément naît déjà à opacity 1 → coupure instantanée).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setRender(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setVisible(true));
      });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    } else {
      setVisible(false);
      const t = setTimeout(() => setRender(false), 450); // = durée du fondu CSS
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!render) return null;

  return (
    <div className={`chill-bg ${visible ? "is-visible" : ""}`} aria-hidden>
      <video autoPlay loop muted playsInline>
        {/* WEBM en priorité (plus léger), MP4 en repli pour Safari/iOS */}
        <source src="/videos/BG_DEFAULT.webm" type="video/webm" />
        <source src="/videos/BG_DEFAULT.mp4" type="video/mp4" />
      </video>
      <div className="chill-bg__scrim" />
    </div>
  );
}
