"use client";

import { useEffect, useRef, useState } from "react";
import { type Participant, Track } from "livekit-client";
import { useParticipantInfo, useTracks } from "@livekit/components-react";
import { Eye, EyeOff } from "lucide-react";
import { participantGradient, initials } from "@/lib/participantColors";
import { useChillMode } from "./ChillModeContext";

export function VideoTile({
  participant,
  isLocal,
}: {
  participant: Participant;
  isLocal: boolean;
}) {
  const { name } = useParticipantInfo({ participant });
  const { chillMode } = useChillMode();

  // Masquage local de la caméra d'un autre participant (purement côté client :
  // on affiche son avatar à la place de son flux). Réservé aux tuiles distantes.
  const [manuallyHidden, setManuallyHidden] = useState(false);

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const track = tracks.find((t) => t.participant.identity === participant.identity);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaTrack = track?.publication?.track;

  // The <video> element stays mounted at all times (hidden when the camera is
  // off). If it were conditionally rendered, turning the camera back on would
  // remount a fresh element while this effect's dep (the track object) is
  // unchanged → it wouldn't re-attach, and the feed would never reappear.
  useEffect(() => {
    if (!videoRef.current || !mediaTrack) return;
    mediaTrack.attach(videoRef.current);
    return () => { mediaTrack.detach(); };
  }, [mediaTrack]);

  const cameraOff =
    manuallyHidden || !track || track.publication?.isMuted || !track.publication?.isSubscribed;

  const displayName = name || "Anonyme";

  return (
    <div
      className="group relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center shadow-[0_12px_30px_rgba(20,30,45,.12)]"
      style={{
        background: participantGradient(participant.identity, isLocal),
        boxShadow: isLocal ? "0 0 0 2px #2f7dc4, 0 12px 30px rgba(20,30,45,.12)" : undefined,
        // Force une couche de composition dédiée : évite le « flash » d'angles droits
        // quand l'opacité du conteneur parent s'anime.
        transform: "translateZ(0)",
        isolation: "isolate",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        style={{
          transform: isLocal ? "scaleX(-1)" : undefined,
          display: cameraOff ? "none" : undefined,
        }}
      />
      {cameraOff && (
        <span
          className="font-display font-bold uppercase select-none"
          style={{
            fontSize: "42px",
            letterSpacing: "0.02em",
            color: "rgba(255,255,255,.96)",
            textShadow: "0 1px 6px rgba(20,30,45,.18)",
          }}
        >
          {initials(displayName)}
        </span>
      )}

      {/* Masquer/afficher la caméra d'un autre participant (apparaît au survol) */}
      {!isLocal && (
        <button
          onClick={() => setManuallyHidden((h) => !h)}
          className="absolute top-[11px] right-[11px] z-10 w-8 h-8 grid place-items-center rounded-lg text-white transition opacity-0 group-hover:opacity-100 focus:opacity-100"
          style={{ background: "rgba(10,16,24,.45)", backdropFilter: "blur(4px)" }}
          title={manuallyHidden ? "Afficher la caméra" : "Masquer la caméra"}
        >
          {manuallyHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      )}

      {/* Présence : point vert en mode sérieux, pilule orange « Chill mode » en chill */}
      {chillMode ? (
        <span className="cg-chill-badge absolute top-[11px] left-[11px]">Chill mode</span>
      ) : (
        <span
          className="absolute top-[13px] left-[13px] w-[9px] h-[9px] rounded-full"
          style={{ background: "#46d784", boxShadow: "0 0 0 2px rgba(255,255,255,.35)" }}
        />
      )}

      {/* Name label */}
      <span
        className="absolute left-[13px] bottom-[13px] text-[12.5px] font-semibold text-white rounded-lg px-2.5 py-1"
        style={{ background: "rgba(10,16,24,.42)", backdropFilter: "blur(4px)" }}
      >
        {displayName}{isLocal && " (vous)"}
      </span>
    </div>
  );
}
