"use client";

import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { VideoTile } from "./VideoTile";

// Fixed tile size: largest square that lets a 3×3 grid (9 tiles) fit the scene,
// using container-query units so it stays responsive. Tiles wrap 3 per row and
// the whole block is centered both axes → incomplete rows stay centered, and a
// lone participant sits in the middle rather than stuck to the left.
const TILE_SIZE = "min(calc((100cqw - 28px) / 3), calc((100cqh - 28px) / 3))";

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

  const tiles = [
    { participant: localParticipant, isLocal: true },
    ...remoteParticipants.map((p) => ({ participant: p, isLocal: false })),
  ];

  return (
    <div className="flex-1 overflow-auto p-[18px]" style={{ containerType: "size" }}>
      <div className="flex flex-wrap content-center justify-center items-center gap-[14px] h-full">
        {tiles.map(({ participant, isLocal }) => (
          <div
            key={participant.identity}
            className="shrink-0"
            style={{ width: TILE_SIZE, height: TILE_SIZE }}
          >
            <VideoTile participant={participant} isLocal={isLocal} />
          </div>
        ))}
      </div>
    </div>
  );
}
