"use client";

import { createContext, useContext } from "react";

// État partagé du « Chill Mode » entre tous les composants de la salle.
// Permet à VideoGrid, VideoTile, Chat, Controls, etc. de réagir sans prop-drilling.
export type ChillModeState = {
  // Le mode chill est-il actif ?
  chillMode: boolean;
  // Les tuiles caméra sont-elles visibles ? (toujours true en mode sérieux,
  // togglable en mode chill via le bouton de réaffichage)
  tilesVisible: boolean;
  // Type d'animation des tuiles : "slide" pour l'entrée/sortie du chill mode
  // (sortie par la gauche), "fade" pour le toggle d'affichage en plein chill (fondu au centre).
  tileAnim: "slide" | "fade";
};

export const ChillModeContext = createContext<ChillModeState>({
  chillMode: false,
  tilesVisible: true,
  tileAnim: "slide",
});

export const useChillMode = () => useContext(ChillModeContext);
