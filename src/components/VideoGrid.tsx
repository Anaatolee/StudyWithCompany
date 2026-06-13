"use client";

import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { VideoTile } from "./VideoTile";

export function VideoGrid() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const all = [
    { identity: localParticipant.identity, isLocal: true },
    ...remoteParticipants.map((p) => ({ identity: p.identity, isLocal: false })),
  ];

  if (all.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
        Connexion à la salle...
      </div>
    );
  }

  const cols =
    all.length === 1
      ? "grid-cols-1"
      : all.length <= 4
        ? "grid-cols-2"
        : all.length <= 9
          ? "grid-cols-3"
          : "grid-cols-4";

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className={`grid ${cols} gap-3 auto-rows-min`}>
        {all.map(({ identity, isLocal }) => (
          <VideoTile key={identity} participantIdentity={identity} isLocal={isLocal} />
        ))}
      </div>
    </div>
  );
}
