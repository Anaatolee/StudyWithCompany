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
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

export type PrivateCallInfo = {
  roomName: string;
  token: string;
  peerName: string;
};

const WIDGET_WIDTH = 224; // w-56

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

  // Set initial position bottom-right after mount (we need the real height)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const initial = {
      x: window.innerWidth - WIDGET_WIDTH - 16,
      y: window.innerHeight - rect.height - 16,
    };
    posRef.current = initial;
    setPos(initial);
  }, []);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    const origin = posRef.current ?? {
      x: window.innerWidth - WIDGET_WIDTH - 16,
      y: window.innerHeight - 160 - 16,
    };
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
      className="fixed z-50 w-56 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      style={pos ? { left: pos.x, top: pos.y } : { bottom: 16, right: 16 }}
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
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-accent">
              {peerName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          {peerSpeaking && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{peerName}</p>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Phone className="w-3 h-3" />
            <span>{peerJoined ? "En cours" : "Sonnerie…"}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition border ${
            muted
              ? "bg-red-500/15 border-red-500/30 text-red-300"
              : "bg-background border-border hover:border-accent/50"
          }`}
          title={muted ? "Réactiver le micro" : "Couper le micro"}
        >
          {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {muted ? "Muet" : "Micro"}
        </button>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition shrink-0"
          title="Raccrocher"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
