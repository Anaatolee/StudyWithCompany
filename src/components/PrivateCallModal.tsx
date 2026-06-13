"use client";

import { useState } from "react";
import { Room } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Mic, MicOff, PhoneOff } from "lucide-react";

export type PrivateCallInfo = {
  roomName: string;
  token: string;
  peerName: string;
};

export function PrivateCallModal({
  info,
  onClose,
}: {
  info: PrivateCallInfo;
  onClose: () => void;
}) {
  const [callRoom] = useState(() => new Room());
  const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  async function handleClose() {
    await callRoom.disconnect();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl">
        <LiveKitRoom
          room={callRoom}
          token={info.token}
          serverUrl={lkUrl}
          connect={true}
          audio={true}
          video={false}
        >
          <RoomAudioRenderer />
          <CallContent peerName={info.peerName} onClose={handleClose} />
        </LiveKitRoom>
      </div>
    </div>
  );
}

function CallContent({ peerName, onClose }: { peerName: string; onClose: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [muted, setMuted] = useState(false);

  async function toggleMute() {
    const next = !muted;
    await localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  const peerJoined = remoteParticipants.length > 0;

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-semibold text-accent">
            {peerName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <h2 className="text-lg font-semibold">{peerName}</h2>
        <p className="text-sm text-muted mt-1">
          {peerJoined ? "Appel en cours" : "Sonnerie..."}
        </p>
      </div>

      {/* Speaking indicators */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <SpeakingDot label="Vous" isSpeaking={!muted} />
        {remoteParticipants.map((p) => (
          <SpeakingDot key={p.identity} label={p.name ?? "Pair"} isSpeaking={p.isSpeaking} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
            muted
              ? "bg-red-500/20 border border-red-500/40 text-red-300"
              : "bg-background border border-border hover:border-accent/50"
          }`}
          title={muted ? "Réactiver le micro" : "Couper le micro"}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onClose}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
          title="Raccrocher"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function SpeakingDot({ label, isSpeaking }: { label: string; isSpeaking: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
          isSpeaking ? "bg-emerald-500 scale-125" : "bg-muted/50"
        }`}
      />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
