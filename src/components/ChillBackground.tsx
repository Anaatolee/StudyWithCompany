"use client";

import { useEffect, useRef, useState } from "react";

// Fond d'écran animé plein écran du Chill Mode.
// Monté uniquement quand le mode est actif (pour ne pas télécharger/jouer la vidéo
// en mode sérieux), avec un démontage différé pour laisser le fondu de sortie se jouer.
export function ChillBackground({ active }: { active: boolean }) {
  const [render, setRender] = useState(active);
  // `visible` pilote la classe is-visible. On le passe à true *après* le montage
  // (double rAF) pour que la transition opacity 0 → 1 se déclenche aussi à l'entrée
  // (sinon l'élément naît déjà à opacity 1 → coupure instantanée).
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Le navigateur met la vidéo en pause quand l'onglet passe en arrière-plan, que le
  // PC se met en veille, ou sous pression mémoire. `autoPlay` ne relance la lecture
  // qu'une seule fois (au montage) → sans ça, on revient sur un fond figé/gris.
  // On relance donc .play() dès que l'onglet redevient visible ou que la vidéo cale.
  useEffect(() => {
    if (!render) return;
    const v = videoRef.current;
    if (!v) return;
    const resume = () => {
      if (document.visibilityState === "visible" && v.paused) {
        v.play().catch(() => { /* autoplay refusé : on réessaiera au prochain événement */ });
      }
    };
    document.addEventListener("visibilitychange", resume);
    v.addEventListener("pause", resume);
    v.addEventListener("suspend", resume);
    v.addEventListener("stalled", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      v.removeEventListener("pause", resume);
      v.removeEventListener("suspend", resume);
      v.removeEventListener("stalled", resume);
    };
  }, [render]);

  if (!render) return null;

  return (
    <div className={`chill-bg ${visible ? "is-visible" : ""}`} aria-hidden>
      <video ref={videoRef} autoPlay loop muted playsInline preload="auto" poster="/videos/BG_DEFAULT_poster.jpg">
        {/* WEBM en priorité (plus léger), MP4 en repli pour Safari/iOS */}
        <source src="/videos/BG_DEFAULT.webm" type="video/webm" />
        <source src="/videos/BG_DEFAULT.mp4" type="video/mp4" />
      </video>
      <div className="chill-bg__scrim" />
    </div>
  );
}
