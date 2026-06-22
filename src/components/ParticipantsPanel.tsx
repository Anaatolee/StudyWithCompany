"use client";

import { useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { MessageSquare, Phone, Search, Users, X } from "lucide-react";
import { participantGradient } from "@/lib/participantColors";

type Props = {
  onCall: (peerUserId: string, peerName: string) => void;
  callDisabled: boolean;
  onMessage: (peerUserId: string, peerUsername: string) => void;
  unreadCounts: Record<string, number>;
  onClose: () => void;
};

// Full-height panel that overlays the chat area. Lists every participant with a
// search box (scales to large rooms) and keeps the per-row message / call
// actions unchanged.
export function ParticipantsPanel({
  onCall,
  callDisabled,
  onMessage,
  unreadCounts,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const ordered: { p: Participant; isLocal: boolean }[] = [
    { p: localParticipant, isLocal: true },
    ...remoteParticipants.map((p) => ({ p, isLocal: false })),
  ];
  const total = ordered.length;

  const q = search.trim().toLowerCase();
  const visible = q
    ? ordered.filter(({ p }) => (p.name || "Anonyme").toLowerCase().includes(q))
    : ordered;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-border">
        <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted">
          <Users className="w-[15px] h-[15px]" />
          Participants ({total})
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:bg-surface-2 transition"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un participant…"
            className="w-full bg-surface-2 border border-border rounded-[10px] pl-9 pr-3 py-2 text-[14px] text-foreground placeholder:text-muted outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(47,125,196,.14)]"
          />
        </div>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-0.5">
        {visible.length === 0 ? (
          <li className="text-center text-muted text-[14px] py-10">
            Aucun participant trouvé.
          </li>
        ) : (
          visible.map(({ p, isLocal }) => {
            const name = p.name || "Anonyme";
            const unread = unreadCounts[p.identity] ?? 0;
            return (
              <li
                key={p.identity}
                className={`flex items-center gap-[11px] px-2.5 py-[9px] rounded-[11px] ${
                  isLocal ? "bg-surface-2" : ""
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
                      className="relative w-8 h-8 grid place-items-center rounded-lg bg-surface-2 text-muted hover:brightness-95 transition"
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
                      className="w-8 h-8 grid place-items-center rounded-lg bg-accent-soft text-accent hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Appel privé en vocal"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
