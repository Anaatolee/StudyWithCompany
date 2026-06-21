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

  return (
    <div className="flex-1 overflow-auto p-[18px]">
      <div className="grid grid-cols-3 auto-rows-fr gap-[14px] h-full">
        <VideoTile key={localParticipant.identity} participant={localParticipant} isLocal={true} />
        {remoteParticipants.map((p) => (
          <VideoTile key={p.identity} participant={p} isLocal={false} />
        ))}
      </div>
    </div>
  );
}
