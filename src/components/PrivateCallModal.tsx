"use client";

import { useEffect, useRef, useState } from "react";
import { ConnectionState, Room } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useChillMode } from "./ChillModeContext";

export type PrivateCallInfo = {
  roomName: string;
  token: string;
  peerName: string;
};

const WIDGET_WIDTH = 180; // w-[180px]

export function PrivateCallModal({
  info,
  onClose,
}: {
  info: PrivateCallInfo;
  onClose: () => void;
}) {
  const [callRoom] = useState(() => new Room());
  const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;
  const { chillMode } = useChillMode();

  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    // On first drag, snapshot the real position from the DOM (CSS bottom/left → top/left)
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const origin = posRef.current ?? {
      x: rect?.left ?? 16,
      y: rect?.top ?? (window.innerHeight - 80),
    };
    posRef.current = origin;
    dragStartRef.current = { mx: e.clientX, my: e.clientY, ox: origin.x, oy: origin.y };

    function onMove(ev: MouseEvent) {
      if (!dragStartRef.current) return;
      const el = containerRef.current;
      const h = el ? el.offsetHeight : 160;
      const next = {
        x: Math.max(0, Math.min(window.innerWidth - WIDGET_WIDTH, dragStartRef.current.ox + ev.clientX - dragStartRef.current.mx)),
        y: Math.max(0, Math.min(window.innerHeight - h, dragStartRef.current.oy + ev.clientY - dragStartRef.current.my)),
      };
      posRef.current = next;
      setPos({ ...next });
    }

    function onUp() {
      dragStartRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function handleClose() {
    await callRoom.disconnect();
    onClose();
  }

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 w-[180px] rounded-2xl shadow-2xl overflow-hidden ${
        chillMode ? "cg-panel" : "bg-surface border border-border"
      }`}
      style={pos ? { left: pos.x, top: pos.y } : { bottom: 16, left: 16 }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        className={`h-6 flex items-center justify-center cursor-grab active:cursor-grabbing select-none border-b ${chillMode ? "border-white/15" : "border-border/50"}`}
        title="Déplacer"
      >
        <div className={`w-8 h-1 rounded-full ${chillMode ? "bg-white/40" : "bg-border"}`} />
      </div>

      <LiveKitRoom
        room={callRoom}
        token={info.token}
        serverUrl={lkUrl}
        connect={true}
        video={false}
      >
        <RoomAudioRenderer />
        <CallWidget peerName={info.peerName} onClose={handleClose} chill={chillMode} />
      </LiveKitRoom>
    </div>
  );
}

function CallWidget({ peerName, onClose, chill }: { peerName: string; onClose: () => void; chill: boolean }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  // Volume d'écoute de la voix du correspondant (0 = muet, 1 = normal, 2 = boosté)
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      localParticipant.setMicrophoneEnabled(true);
    }
  }, [connectionState, localParticipant]);

  // Applique le volume à chaque participant distant (réappliqué quand il rejoint)
  useEffect(() => {
    for (const p of remoteParticipants) p.setVolume(volume);
  }, [remoteParticipants, volume]);

  async function toggleMute() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  const peerJoined = remoteParticipants.length > 0;
  const muted = !isMicrophoneEnabled;
  const peerSpeaking = remoteParticipants.some((p) => p.isSpeaking);

  return (
    <>
    <div className="px-2.5 py-2 flex items-center gap-2">
      {/* Avatar + infos */}
      <div className="relative shrink-0">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-accent">
            {peerName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        {peerSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-surface" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold truncate leading-none">{peerName}</p>
        <p className="text-[10.5px] text-muted leading-none mt-0.5">{peerJoined ? "En cours" : "Sonnerie…"}</p>
      </div>

      {/* Boutons */}
      <button
        onClick={() => setShowVolume((v) => !v)}
        disabled={!peerJoined}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition border shrink-0 disabled:opacity-40 ${
          showVolume
            ? "bg-accent/20 border-accent/40 text-accent"
            : chill
              ? "bg-white/12 border-white/20 text-white hover:brightness-110"
              : "bg-background border-border text-muted hover:border-accent/50"
        }`}
        title="Volume de la voix"
      >
        {volume === 0 ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      </button>

      <button
        onClick={toggleMute}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition border shrink-0 ${
          muted
            ? "bg-red-500/15 border-red-500/30 text-red-400"
            : chill
              ? "bg-white/12 border-white/20 text-white hover:brightness-110"
              : "bg-background border-border text-muted hover:border-accent/50"
        }`}
        title={muted ? "Réactiver le micro" : "Couper le micro"}
      >
        {muted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
      </button>

      <button
        onClick={onClose}
        className="w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition shrink-0"
        title="Raccrocher"
      >
        <PhoneOff className="w-3 h-3" />
      </button>
    </div>

    {/* Curseur de volume de la voix du correspondant (0 → 200 %) */}
    {showVolume && (
      <div className={`px-3 pb-2.5 flex items-center gap-2 ${chill ? "text-white" : "text-muted"}`}>
        <VolumeX className="w-3.5 h-3.5 shrink-0" />
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="flex-1 accent-[#3b82f6] h-1 cursor-pointer"
          title={`${Math.round(volume * 100)} %`}
        />
        <Volume2 className="w-4 h-4 shrink-0" />
      </div>
    )}
    </>
  );
}
