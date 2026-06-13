"use client";

import { useEffect, useRef } from "react";
import {
  useParticipantInfo,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { CameraOff, User } from "lucide-react";

export function VideoTile({
  participantIdentity,
  isLocal,
}: {
  participantIdentity: string;
  isLocal: boolean;
}) {
  const { name } = useParticipantInfo({ identity: participantIdentity });

  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });

  const track = tracks.find(
    (t) => t.participant.identity === participantIdentity
  );

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !track?.publication?.track) return;
    track.publication.track.attach(videoRef.current);
    return () => {
      track.publication?.track?.detach();
    };
  }, [track?.publication?.track]);

  const cameraOff = !track || track.publication?.isMuted || !track.publication?.isSubscribed;

  return (
    <div className="relative bg-black/40 border border-border rounded-xl overflow-hidden aspect-video">
      {!cameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={isLocal ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <div className="flex flex-col items-center gap-2 text-muted">
            <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <CameraOff className="w-4 h-4" />
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2">
        <span className="bg-black/60 backdrop-blur px-2 py-1 rounded-md text-xs text-white truncate">
          {name || "Anonyme"} {isLocal && "(vous)"}
        </span>
      </div>
    </div>
  );
}
