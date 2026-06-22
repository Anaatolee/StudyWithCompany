"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, MicOff, PhoneOff } from "lucide-react";

export function Controls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const router = useRouter();

  const cameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
  const cameraOn = cameraPublication && !cameraPublication.isMuted;

  async function toggleCamera() {
    await localParticipant.setCameraEnabled(!cameraOn);
  }

  async function leave() {
    onLeave();
    router.push("/rooms");
  }

  return (
    <div className="absolute left-1/2 bottom-5 -translate-x-1/2 flex items-center gap-[9px] px-[9px] py-2 rounded-[14px] bg-surface border border-border shadow-[0_16px_40px_rgba(20,30,45,.18)]">
      {/* Caméra (toggle) — on garde l'icône CameraOff pour l'état "coupée" */}
      <button
        onClick={toggleCamera}
        className={`flex items-center gap-2 text-[12.5px] font-semibold rounded-[10px] px-[15px] py-[9px] transition ${
          cameraOn ? "bg-accent text-white" : "bg-accent-soft text-accent"
        }`}
        title={cameraOn ? "Couper la caméra" : "Activer la caméra"}
      >
        {cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
        {cameraOn ? "Caméra activée" : "Caméra coupée"}
      </button>

      {/* Micro verrouillé (non interactif) */}
      <div
        className="flex items-center gap-2 text-[12.5px] font-semibold rounded-[10px] px-[13px] py-[9px] bg-surface-2 text-muted cursor-not-allowed"
        title="Le micro est désactivé dans les salles d'étude. Lancez un appel privé pour parler en vocal."
      >
        <MicOff className="w-4 h-4" />
        Micro verrouillé
      </div>

      {/* Quitter */}
      <button
        onClick={leave}
        className="flex items-center gap-2 text-[12.5px] font-semibold rounded-[10px] px-[15px] py-[9px] bg-[#b8473f] text-white shadow-[0_6px_16px_rgba(184,71,63,.32)] hover:brightness-95 transition"
      >
        <PhoneOff className="w-4 h-4" />
        Quitter
      </button>
    </div>
  );
}
