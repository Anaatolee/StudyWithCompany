"use client";

import { useEffect, useRef } from "react";
import { Track } from "livekit-client";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
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
  const { chillMode, tilesVisible } = useChillMode();

  // Partages d'écran actifs (local + distants). Quand il y en a, on bascule en
  // mode « spotlight » : l'écran en grand, les caméras en petit dessous.
  const screenShares = useTracks([Track.Source.ScreenShare]).filter(
    (t) => t.publication?.track
  );

  const hidden = chillMode && !tilesVisible;

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

  const hasShare = screenShares.length > 0;

  return (
    <div
      className="flex-1 p-[18px] overflow-auto"
      style={{ containerType: "size" }}
    >
      {/* Disparition / apparition en fondu d'opacité pur (pas de transform : un
          scale sur ce conteneur ferait momentanément « sauter » l'arrondi des tuiles). */}
      <div
        className={`flex flex-col h-full transition-opacity duration-[360ms] ease-out ${
          hidden ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {hasShare ? (
          <>
            {/* Spotlight : un ou plusieurs écrans partagés en grand */}
            <div className="flex-1 flex flex-wrap gap-3 justify-center items-center min-h-0">
              {screenShares.map((t) => (
                <ScreenShareTile key={t.publication!.trackSid} trackRef={t} />
              ))}
            </div>
            {/* Caméras réduites sous le partage */}
            <div className="flex gap-2.5 justify-center items-center shrink-0 mt-3 h-[112px]">
              {tiles.map(({ participant, isLocal }) => (
                <div key={participant.identity} className="shrink-0 h-full aspect-square">
                  <VideoTile participant={participant} isLocal={isLocal} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap content-center justify-center items-center gap-[14px] h-full">
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
        )}
      </div>
    </div>
  );
}

// Affiche une piste de partage d'écran (objet vidéo attaché à la volée).
function ScreenShareTile({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaTrack = trackRef.publication?.track;
  const name = trackRef.participant.name || "Anonyme";

  useEffect(() => {
    if (!videoRef.current || !mediaTrack) return;
    mediaTrack.attach(videoRef.current);
    return () => { mediaTrack.detach(); };
  }, [mediaTrack]);

  return (
    <div className="relative h-full max-h-full max-w-full bg-black rounded-2xl overflow-hidden shadow-[0_12px_30px_rgba(20,30,45,.18)]"
      style={{ aspectRatio: "16 / 9" }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      <span
        className="absolute left-[13px] bottom-[13px] text-[12.5px] font-semibold text-white rounded-lg px-2.5 py-1"
        style={{ background: "rgba(10,16,24,.55)", backdropFilter: "blur(4px)" }}
      >
        {name} — écran partagé
      </span>
    </div>
  );
}
