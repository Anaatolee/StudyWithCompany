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
import { Mic, MicOff, PhoneOff } from "lucide-react";

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
      className="fixed z-50 w-[180px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      style={pos ? { left: pos.x, top: pos.y } : { bottom: 16, left: 16 }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        className="h-6 flex items-center justify-center cursor-grab active:cursor-grabbing select-none border-b border-border/50"
        title="Déplacer"
      >
        <div className="w-8 h-1 bg-border rounded-full" />
      </div>

      <LiveKitRoom
        room={callRoom}
        token={info.token}
        serverUrl={lkUrl}
        connect={true}
        video={false}
      >
        <RoomAudioRenderer />
        <CallWidget peerName={info.peerName} onClose={handleClose} />
      </LiveKitRoom>
    </div>
  );
}

function CallWidget({ peerName, onClose }: { peerName: string; onClose: () => void }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      localParticipant.setMicrophoneEnabled(true);
    }
  }, [connectionState, localParticipant]);

  async function toggleMute() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  const peerJoined = remoteParticipants.length > 0;
  const muted = !isMicrophoneEnabled;
  const peerSpeaking = remoteParticipants.some((p) => p.isSpeaking);

  return (
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
        onClick={toggleMute}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition border shrink-0 ${
          muted
            ? "bg-red-500/15 border-red-500/30 text-red-400"
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
  );
}
