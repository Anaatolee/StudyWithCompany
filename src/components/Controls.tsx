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
    if (cameraOn) {
      await localParticipant.setCameraEnabled(false);
    } else {
      await localParticipant.setCameraEnabled(true);
    }
  }

  async function leave() {
    onLeave();
    router.push("/rooms");
  }

  return (
    <div className="flex items-center justify-center gap-2 p-3 border-t border-border bg-surface">
      <button
        onClick={toggleCamera}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
          cameraOn
            ? "bg-background border border-border hover:border-accent/50"
            : "bg-red-500/10 border border-red-500/30 text-red-300"
        }`}
        title={cameraOn ? "Couper la caméra" : "Activer la caméra"}
      >
        {cameraOn ? (
          <Camera className="w-4 h-4" />
        ) : (
          <CameraOff className="w-4 h-4" />
        )}
        <span className="text-sm hidden sm:inline">
          {cameraOn ? "Caméra" : "Caméra coupée"}
        </span>
      </button>

      <div
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/50 border border-border text-muted cursor-not-allowed"
        title="Le micro est désactivé dans les salles d'étude. Lancez un appel privé pour parler en vocal."
      >
        <MicOff className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">Micro verrouillé</span>
      </div>

      <button
        onClick={leave}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
      >
        <PhoneOff className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">Quitter</span>
      </button>
    </div>
  );
}
