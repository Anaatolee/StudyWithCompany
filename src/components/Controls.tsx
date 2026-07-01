"use client";

import { useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, PhoneOff } from "lucide-react";

export function Controls({ onLeave, shiftLeft = false }: { onLeave: () => void; shiftLeft?: boolean }) {
  const router = useRouter();

  const { enabled: cameraOn, pending, toggle } = useTrackToggle({
    source: Track.Source.Camera,
  });

  async function leave() {
    onLeave();
    router.push("/rooms");
  }

  return (
    // Pendant l'entrée en chill, <main> n'a pas encore rétréci (mr-340 → mr-356 en fin de
    // fondu) : on décale la barre de 8px pour qu'elle rejoigne sa position chill dès le clic,
    // sans attendre la fin du fondu — et sans faire bouger les tuiles.
    <div
      className="cg-dock absolute bottom-5 flex items-center gap-[9px] px-[9px] py-2 rounded-[14px] bg-surface border border-border shadow-[0_16px_40px_rgba(20,30,45,.18)]"
      style={{ left: "50%", transform: shiftLeft ? "translateX(calc(-50% - 8px))" : "translateX(-50%)" }}
    >
      <button
        onClick={() => toggle()}
        disabled={pending}
        className={`flex items-center gap-2 text-[12.5px] font-semibold rounded-[10px] px-[15px] py-[9px] transition disabled:opacity-60 ${
          cameraOn ? "bg-accent text-white" : "bg-accent-soft text-accent"
        }`}
        title={cameraOn ? "Couper la caméra" : "Activer la caméra"}
      >
        {cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
        {cameraOn ? "Caméra activée" : "Caméra coupée"}
      </button>

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
