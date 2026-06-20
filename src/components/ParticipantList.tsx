"use client";

import { useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { ChevronDown, ChevronRight, Phone, Users } from "lucide-react";

type Props = {
  onCall: (peerUserId: string, peerName: string) => void;
  callDisabled: boolean;
};

export function ParticipantList({ onCall, callDisabled }: Props) {
  const [open, setOpen] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const total = 1 + remoteParticipants.length;

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-1.5 px-3 py-2 text-xs uppercase tracking-wide text-muted hover:bg-background transition"
      >
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Participants ({total})
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <ul className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          <li className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-background">
            <span className="text-sm truncate">
              {localParticipant.name || "Anonyme"}
              <span className="text-muted ml-1">(vous)</span>
            </span>
          </li>
          {remoteParticipants.map((p) => (
            <li
              key={p.identity}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-background"
            >
              <span className="text-sm truncate">{p.name || "Anonyme"}</span>
              <button
                onClick={() => onCall(p.identity, p.name ?? "Anonyme")}
                disabled={callDisabled}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Appel privé en vocal"
              >
                <Phone className="w-3 h-3" />
                Appeler
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
