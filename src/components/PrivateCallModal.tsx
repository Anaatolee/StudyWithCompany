"use client";

import { useEffect, useRef, useState } from "react";
import { ConnectionState, Room, Track } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useTrackToggle,
} from "@livekit/components-react";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useChillMode } from "./ChillModeContext";

export type PrivateCallInfo = {
  roomName: string;
  token: string;
  peerName: string;
};

const WIDGET_WIDTH = 220;

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
      className={`fixed z-50 w-[220px] rounded-2xl shadow-2xl overflow-hidden ${
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
        <ScreenShareView chill={chillMode} />
        <CallWidget peerName={info.peerName} onClose={handleClose} chill={chillMode} />
      </LiveKitRoom>
    </div>
  );
}

/** Affiche le partage d'écran actif dans la salle d'appel (local ou distant). */
function ScreenShareView({ chill }: { chill: boolean }) {
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const active = screenTracks.filter((t) => t.publication?.track);
  if (active.length === 0) return null;
  return (
    <div className={`border-b ${chill ? "border-white/15" : "border-border/50"}`}>
      {active.map((t) => (
        <ScreenShareTile key={t.publication!.trackSid} trackRef={t} />
      ))}
    </div>
  );
}

function ScreenShareTile({ trackRef }: { trackRef: ReturnType<typeof useTracks>[number] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaTrack = trackRef.publication?.track;

  useEffect(() => {
    if (!videoRef.current || !mediaTrack) return;
    mediaTrack.attach(videoRef.current);
    return () => { mediaTrack.detach(); };
  }, [mediaTrack]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full aspect-video object-contain bg-black"
    />
  );
}

function CallWidget({ peerName, onClose, chill }: { peerName: string; onClose: () => void; chill: boolean }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);

  const { enabled: sharing, pending: sharePending, toggle: toggleShare } = useTrackToggle({
    source: Track.Source.ScreenShare,
  });

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      localParticipant.setMicrophoneEnabled(true);
    }
  }, [connectionState, localParticipant]);

  async function toggleMute() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  function applyVolume(vol: number) {
    setVolume(vol);
    for (const p of remoteParticipants) {
      try { p.setVolume(vol); } catch (err) { console.warn("setVolume:", err); }
    }
  }

  const peerJoined = remoteParticipants.length > 0;
  const muted = !isMicrophoneEnabled;
  const peerSpeaking = remoteParticipants.some((p) => p.isSpeaking);

  const btnBase = "w-8 h-8 rounded-lg flex items-center justify-center transition border shrink-0";
  const btnNeutral = chill
    ? "bg-white/12 border-white/20 text-white hover:brightness-110"
    : "bg-background border-border text-muted hover:border-accent/50";

  return (
    <div className="px-2.5 py-2.5 flex flex-col gap-2">
      {/* Ligne 1 : avatar + nom + statut */}
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-accent">
              {peerName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          {peerSpeaking && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-surface" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold truncate leading-none">{peerName}</p>
          <p className="text-[11px] text-muted leading-none mt-1">
            {peerJoined ? "En cours" : "Sonnerie…"}
          </p>
        </div>
      </div>

      {/* Ligne 2 : boutons d'action */}
      <div className="flex items-center gap-1.5">
        {/* Partage d'écran */}
        <button
          onClick={() => toggleShare()}
          disabled={sharePending || !peerJoined}
          title={sharing ? "Arrêter le partage d'écran" : "Partager mon écran"}
          className={`${btnBase} disabled:opacity-40 ${
            sharing ? "bg-accent/20 border-accent/40 text-accent" : btnNeutral
          }`}
        >
          {sharing ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
        </button>

        {/* Volume */}
        <button
          onClick={() => setShowVolume((v) => !v)}
          disabled={!peerJoined}
          title="Volume de la voix"
          className={`${btnBase} disabled:opacity-40 ${
            showVolume ? "bg-accent/20 border-accent/40 text-accent" : btnNeutral
          }`}
        >
          {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Micro */}
        <button
          onClick={toggleMute}
          title={muted ? "Réactiver le micro" : "Couper le micro"}
          className={`${btnBase} ${
            muted ? "bg-red-500/15 border-red-500/30 text-red-400" : btnNeutral
          }`}
        >
          {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        {/* Raccrocher */}
        <button
          onClick={onClose}
          title="Raccrocher"
          className={`${btnBase} bg-red-500 hover:bg-red-600 text-white border-transparent`}
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Curseur de volume */}
      {showVolume && (
        <div className={`flex items-center gap-2 ${chill ? "text-white" : "text-muted"}`}>
          <VolumeX className="w-3.5 h-3.5 shrink-0" />
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={volume}
            onChange={(e) => applyVolume(Number(e.target.value))}
            className="flex-1 accent-[#3b82f6] h-1 cursor-pointer"
            title={`${Math.round(volume * 100)} %`}
          />
          <Volume2 className="w-3.5 h-3.5 shrink-0" />
        </div>
      )}
    </div>
  );
}
