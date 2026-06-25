"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { Maximize2, Mic, MicOff, Minimize2, Monitor, MonitorOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
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
  const [screenExpanded, setScreenExpanded] = useState(false);
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
    // z-[70] : reste au-dessus de l'overlay plein écran (z-[60])
    <div
      ref={containerRef}
      className={`fixed z-[70] w-[220px] rounded-2xl shadow-2xl overflow-hidden ${
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
        <ScreenShareView chill={chillMode} expanded={screenExpanded} onExpandChange={setScreenExpanded} />
        <CallWidget peerName={info.peerName} onClose={handleClose} chill={chillMode} hidden={screenExpanded} />
      </LiveKitRoom>
    </div>
  );
}

/** Affiche le partage d'écran : miniature dans le widget + bouton pour passer en grand. */
function ScreenShareView({ chill, expanded, onExpandChange }: { chill: boolean; expanded: boolean; onExpandChange: (v: boolean) => void }) {
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const active = screenTracks.filter((t) => t.publication?.track);

  // Referme automatiquement l'overlay si le partage s'arrête
  useEffect(() => {
    if (active.length === 0) onExpandChange(false);
  }, [active.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (active.length === 0) return null;

  return (
    <>
      {/* Miniature dans le widget (masquée quand l'overlay est ouvert) */}
      {!expanded && (
        <div className={`relative border-b ${chill ? "border-white/15" : "border-border/50"}`}>
          {active.map((t) => (
            <ScreenShareTile key={t.publication!.trackSid} trackRef={t} />
          ))}
          <button
            onClick={() => onExpandChange(true)}
            title="Agrandir le partage d'écran"
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Overlay plein écran (portal vers document.body, z-[60] < widget z-[70]) */}
      {expanded && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Fond flouté — clic pour réduire */}
          <div
            className="absolute inset-0 backdrop-blur-md bg-black/10"
            onClick={() => onExpandChange(false)}
          />
          {/* Conteneur vidéo centré */}
          <div className="relative z-10 w-[90vw] max-h-[90vh] flex items-center justify-center">
            <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,.55)]"
              style={{ aspectRatio: "16/9", maxHeight: "90vh" }}
            >
              {active.map((t) => (
                <ScreenShareTile key={t.publication!.trackSid} trackRef={t} fill />
              ))}
            </div>
            {/* Bouton réduire */}
            <button
              onClick={() => onExpandChange(false)}
              title="Réduire"
              className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition shadow-lg"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

type TrackRef = ReturnType<typeof useTracks>[number];

function ScreenShareTile({ trackRef, fill }: { trackRef: TrackRef; fill?: boolean }) {
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
      className={fill ? "absolute inset-0 w-full h-full object-contain bg-black" : "w-full aspect-video object-contain bg-black"}
    />
  );
}

function CallWidget({ peerName, onClose, chill, hidden }: { peerName: string; onClose: () => void; chill: boolean; hidden: boolean }) {
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

  if (hidden) return null;

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
