"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { VideoTile } from "./VideoTile";
import { useChillMode } from "./ChillModeContext";

// Fixed tile size: largest square that lets a 3×3 grid (9 tiles) fit the scene,
// using container-query units so it stays responsive. Tiles wrap 3 per row and
// the whole block is centered both axes → incomplete rows stay centered, and a
// lone participant sits in the middle rather than stuck to the left.
const TILE_SIZE = "min(calc((100cqw - 28px) / 3), calc((100cqh - 28px) / 3))";

export function VideoGrid() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { chillMode, tilesVisible, tileAnim } = useChillMode();

  const hidden = chillMode && !tilesVisible;

  // Après le slide de sortie (entrée en chill), on « pose » les tuiles au centre
  // (toujours invisibles) : ainsi le ré-affichage via le bouton Caméras se fait
  // en fondu central, et non en re-slidant depuis la gauche.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (hidden && tileAnim === "slide") {
      const t = setTimeout(() => setSettled(true), 480); // = durée du slide
      return () => clearTimeout(t);
    }
    setSettled(false);
  }, [hidden, tileAnim]);

  const total = 1 + remoteParticipants.length;

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
        Connexion à la salle...
      </div>
    );
  }

  const tiles = [
    { participant: localParticipant, isLocal: true },
    ...remoteParticipants.map((p) => ({ participant: p, isLocal: false })),
  ];

  // "slide" → sortie/entrée par la gauche (bascule du mode) ;
  // "fade"  → fondu au centre (toggle d'affichage en plein chill).
  const transition =
    tileAnim === "slide"
      ? "duration-[480ms] ease-[cubic-bezier(.4,0,.2,1)]"
      : "duration-[320ms] ease-out";
  // Slide vers la gauche tant que pas « posé » ; sinon (ou en fade) fondu central.
  const hiddenState =
    tileAnim === "slide" && !settled ? "-translate-x-[135%] opacity-0" : "opacity-0 scale-[.96]";

  return (
    <div
      className={`flex-1 p-[18px] ${chillMode ? "overflow-hidden" : "overflow-auto"}`}
      style={{ containerType: "size" }}
    >
      <div
        className={`flex flex-wrap content-center justify-center items-center gap-[14px] h-full transition-[transform,opacity] ${transition} ${
          hidden ? `${hiddenState} pointer-events-none` : "translate-x-0 opacity-100 scale-100"
        }`}
      >
        {tiles.map(({ participant, isLocal }) => (
          <div
            key={participant.identity}
            className="shrink-0"
            style={{ width: TILE_SIZE, height: TILE_SIZE }}
          >
            <VideoTile participant={participant} isLocal={isLocal} />
          </div>
        ))}
      </div>
    </div>
  );
}
