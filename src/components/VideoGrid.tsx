"use client";

import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { VideoTile } from "./VideoTile";

export function VideoGrid() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const total = 1 + remoteParticipants.length;

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
        Connexion à la salle...
      </div>
    );
  }

  const cols =
    total === 1
      ? "grid-cols-1"
      : total <= 4
        ? "grid-cols-2"
        : total <= 9
          ? "grid-cols-3"
          : "grid-cols-4";

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className={`grid ${cols} gap-3 auto-rows-min`}>
        <VideoTile key={localParticipant.identity} participant={localParticipant} isLocal={true} />
        {remoteParticipants.map((p) => (
          <VideoTile key={p.identity} participant={p} isLocal={false} />
        ))}
      </div>
    </div>
  );
}
