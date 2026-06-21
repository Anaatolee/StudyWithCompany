"use client";

import { useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { ChevronDown, ChevronRight, MessageSquare, Phone, Users } from "lucide-react";
import { participantGradient } from "@/lib/participantColors";

type Props = {
  onCall: (peerUserId: string, peerName: string) => void;
  callDisabled: boolean;
  onMessage: (peerUserId: string, peerUsername: string) => void;
  unreadCounts: Record<string, number>;
};

const PAGE_SIZE = 2;

export function ParticipantList({ onCall, callDisabled, onMessage, unreadCounts }: Props) {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(0);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const ordered: { p: Participant; isLocal: boolean }[] = [
    { p: localParticipant, isLocal: true },
    ...remoteParticipants.map((p) => ({ p, isLocal: false })),
  ];
  const total = ordered.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const current = Math.min(page, pages - 1);
  const visible = ordered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-5 pt-[18px] pb-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted"
      >
        <Users className="w-[15px] h-[15px]" />
        Participants ({total})
        {open ? (
          <ChevronDown className="w-4 h-4 ml-auto" strokeWidth={2.4} />
        ) : (
          <ChevronRight className="w-4 h-4 ml-auto" strokeWidth={2.4} />
        )}
      </button>

      {open && (
        <>
          <ul className="px-3 pb-1 space-y-0.5">
            {visible.map(({ p, isLocal }) => {
              const name = p.name || "Anonyme";
              const unread = unreadCounts[p.identity] ?? 0;
              return (
                <li
                  key={p.identity}
                  className={`flex items-center gap-[11px] px-2.5 py-[9px] rounded-[11px] ${
                    isLocal ? "bg-[#eef3f8]" : ""
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full grid place-items-center text-white text-[13px] font-bold shrink-0 uppercase"
                    style={{ background: participantGradient(p.identity, isLocal) }}
                  >
                    {name.charAt(0)}
                  </span>
                  <span className="text-[14.5px] font-semibold text-foreground truncate flex-1">
                    {name}
                    {isLocal && <span className="font-medium text-muted"> (vous)</span>}
                  </span>

                  {!isLocal && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onMessage(p.identity, name)}
                        className="relative w-8 h-8 grid place-items-center rounded-lg bg-[#eef3f8] text-muted hover:brightness-95 transition"
                        title="Message privé"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">
                            {unread}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => onCall(p.identity, name)}
                        disabled={callDisabled}
                        className="w-8 h-8 grid place-items-center rounded-lg bg-[#e3eef8] text-accent hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Appel privé en vocal"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Scroll indicator — one dot per page of participants */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1.5 pb-2">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  aria-label={`Page ${i + 1}`}
                  className="w-[5px] h-[5px] rounded-full transition"
                  style={{ background: i === current ? "#2f7dc4" : "#c4d2e0" }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
