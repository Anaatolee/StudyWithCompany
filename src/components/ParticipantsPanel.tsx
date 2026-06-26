"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import {
  Check, Clock, MessageSquare, Phone, Search, ShieldOff, UserCheck, UserPlus, Users, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useChillMode } from "./ChillModeContext";
import { Avatar } from "./Avatar";
import type { Friendship, FriendState } from "@/lib/types";

type Props = {
  currentUserId: string;
  roomId: string;
  isCreator: boolean;
  onCall: (peerUserId: string, peerName: string) => void;
  callDisabled: boolean;
  onMessage: (peerUserId: string, peerUsername: string) => void;
  unreadCounts: Record<string, number>;
  onClose: () => void;
};

type PeerProfile = {
  avatar_url: string | null;
  bio: string | null;
  username: string | null;
  created_at: string | null;
};
type FriendInfo = { state: FriendState; rowId: string | null };

export function ParticipantsPanel({
  currentUserId,
  roomId,
  isCreator,
  onCall,
  callDisabled,
  onMessage,
  unreadCounts,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Record<string, PeerProfile>>({});
  const [friends, setFriends] = useState<Record<string, FriendInfo>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kickPending, setKickPending] = useState<string | null>(null);
  const [kicking, setKicking] = useState<string | null>(null);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { chillMode } = useChillMode();

  const ordered: { p: Participant; isLocal: boolean }[] = [
    { p: localParticipant, isLocal: true },
    ...remoteParticipants.map((p) => ({ p, isLocal: false })),
  ];
  const total = ordered.length;

  const identityKey = ordered.map(({ p }) => p.identity).sort().join(",");

  useEffect(() => {
    const ids = identityKey ? identityKey.split(",").filter(Boolean) : [];
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, avatar_url, bio, username, created_at")
        .in("id", ids);
      if (cancelled || !data) return;
      const map: Record<string, PeerProfile> = {};
      for (const row of data) {
        map[row.id] = {
          avatar_url: row.avatar_url,
          bio: row.bio,
          username: row.username,
          created_at: row.created_at,
        };
      }
      setProfiles(map);
    })();
    return () => { cancelled = true; };
  }, [identityKey]);

  const loadFriends = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);
    if (!data) return;
    const map: Record<string, FriendInfo> = {};
    for (const r of data as Friendship[]) {
      const peerId = r.requester_id === currentUserId ? r.addressee_id : r.requester_id;
      const state: FriendState =
        r.status === "accepted"
          ? "friends"
          : r.requester_id === currentUserId
            ? "outgoing"
            : "incoming";
      map[peerId] = { state, rowId: r.id };
    }
    setFriends(map);
  }, [currentUserId]);

  useEffect(() => {
    loadFriends();
    const supabase = createClient();
    const channel = supabase
      .channel(`friendships-panel:${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, loadFriends)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, loadFriends]);

  async function sendRequest(peerId: string) {
    setFriends((m) => ({ ...m, [peerId]: { state: "outgoing", rowId: null } }));
    const supabase = createClient();
    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: peerId,
      status: "pending",
    });
    if (error) console.error("[participants] demande d'ami:", error);
    loadFriends();
  }

  async function acceptRequest(peerId: string, rowId: string | null) {
    if (!rowId) return;
    setFriends((m) => ({ ...m, [peerId]: { state: "friends", rowId } }));
    const supabase = createClient();
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", rowId);
    if (error) console.error("[participants] acceptation:", error);
    loadFriends();
  }

  async function kickUser(userId: string) {
    if (kickPending !== userId) { setKickPending(userId); return; }
    setKickPending(null);
    setKicking(userId);
    await fetch(`/api/rooms/${roomId}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setKicking(null);
  }

  const q = search.trim().toLowerCase();
  const visible = q
    ? ordered.filter(({ p }) => (p.name || "Anonyme").toLowerCase().includes(q))
    : ordered;

  // Participant sélectionné pour le modal profil
  const selectedEntry = selectedId ? ordered.find(({ p }) => p.identity === selectedId) : null;

  return (
    <div className={`absolute inset-0 z-10 flex flex-col ${chillMode ? "cg-panel rounded-2xl overflow-hidden" : "bg-surface"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b ${chillMode ? "border-white/15" : "border-border"}`}>
        <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted">
          <Users className="w-[15px] h-[15px]" />
          Participants ({total})
        </span>
        <button
          onClick={onClose}
          className={`w-7 h-7 grid place-items-center rounded-lg transition ${chillMode ? "text-white hover:bg-white/15" : "text-muted hover:bg-surface-2"}`}
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
            className={`w-full rounded-[10px] pl-9 pr-3 py-2 text-[14px] text-foreground placeholder:text-muted outline-none border transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(47,125,196,.14)] ${
              chillMode ? "cg-input bg-white/10 border-white/20" : "bg-surface-2 border-border"
            }`}
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
            const profile = profiles[p.identity];
            const friend = friends[p.identity] ?? { state: "none" as FriendState, rowId: null };
            const areFriends = friend.state === "friends";
            return (
              <li
                key={p.identity}
                onClick={() => setSelectedId(p.identity)}
                className={`flex items-center gap-[11px] px-2.5 py-[9px] rounded-[11px] cursor-pointer transition ${
                  isLocal
                    ? chillMode ? "bg-white/10 hover:bg-white/15" : "bg-surface-2 hover:brightness-95"
                    : chillMode ? "hover:bg-white/8" : "hover:bg-surface-2"
                }`}
              >
                <Avatar
                  url={profile?.avatar_url}
                  name={name}
                  identity={p.identity}
                  isLocal={isLocal}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-foreground truncate">
                    {name}
                    {isLocal && <span className="font-medium text-muted"> (vous)</span>}
                  </p>
                  {profile?.bio && (
                    <p className={`text-[12.5px] truncate ${chillMode ? "text-white/65" : "text-muted"}`}>
                      {profile.bio}
                    </p>
                  )}
                </div>

                {!isLocal && (
                  // stopPropagation : les boutons d'action n'ouvrent pas le modal
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FriendButton
                      friend={friend}
                      chillMode={chillMode}
                      onAdd={() => sendRequest(p.identity)}
                      onAccept={() => acceptRequest(p.identity, friend.rowId)}
                    />

                    <button
                      onClick={() => onMessage(p.identity, name)}
                      className={`relative w-8 h-8 grid place-items-center rounded-lg transition hover:brightness-110 ${
                        chillMode ? "bg-white/12 text-white border border-white/15" : "bg-surface-2 text-muted hover:brightness-95"
                      }`}
                      title="Message privé"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">
                          {unread}
                        </span>
                      )}
                    </button>

                    {areFriends && (
                      <button
                        onClick={() => onCall(p.identity, name)}
                        disabled={callDisabled}
                        className={`w-8 h-8 grid place-items-center rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition ${
                          chillMode ? "bg-white/12 text-white border border-white/15 hover:brightness-110" : "bg-accent-soft text-accent hover:brightness-95"
                        }`}
                        title="Appel privé en vocal"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}

                    {isCreator && (
                      <button
                        onClick={() => kickUser(p.identity)}
                        disabled={kicking === p.identity}
                        className={`w-8 h-8 grid place-items-center rounded-lg transition disabled:opacity-40 ${
                          kickPending === p.identity
                            ? "bg-red-500 text-white"
                            : chillMode
                              ? "bg-white/12 text-white/60 border border-white/15 hover:bg-red-500/60 hover:text-white"
                              : "bg-surface-2 text-muted hover:bg-red-100 hover:text-red-600"
                        }`}
                        title={kickPending === p.identity ? "Confirmer l'exclusion ?" : "Exclure de la salle"}
                      >
                        <ShieldOff className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      {/* Modal profil */}
      {selectedEntry && typeof document !== "undefined" && createPortal(
        <ProfileModal
          name={selectedEntry.p.name || "Anonyme"}
          identity={selectedEntry.p.identity}
          isLocal={selectedEntry.isLocal}
          profile={profiles[selectedEntry.p.identity] ?? null}
          friend={friends[selectedEntry.p.identity] ?? { state: "none" as FriendState, rowId: null }}
          chillMode={chillMode}
          callDisabled={callDisabled}
          unread={unreadCounts[selectedEntry.p.identity] ?? 0}
          isCreator={isCreator}
          onClose={() => setSelectedId(null)}
          onMessage={() => { setSelectedId(null); onMessage(selectedEntry.p.identity, selectedEntry.p.name || "Anonyme"); }}
          onCall={() => { setSelectedId(null); onCall(selectedEntry.p.identity, selectedEntry.p.name || "Anonyme"); }}
          onAddFriend={() => sendRequest(selectedEntry.p.identity)}
          onAcceptFriend={() => acceptRequest(selectedEntry.p.identity, (friends[selectedEntry.p.identity] ?? { rowId: null }).rowId)}
          onKick={() => { setSelectedId(null); kickUser(selectedEntry.p.identity); }}
        />,
        document.body,
      )}
    </div>
  );
}

// ── Modal de profil ────────────────────────────────────────────────────────────

function ProfileModal({
  name,
  identity,
  isLocal,
  profile,
  friend,
  chillMode,
  callDisabled,
  unread,
  isCreator,
  onClose,
  onMessage,
  onCall,
  onAddFriend,
  onAcceptFriend,
  onKick,
}: {
  name: string;
  identity: string;
  isLocal: boolean;
  profile: PeerProfile | null;
  friend: FriendInfo;
  chillMode: boolean;
  callDisabled: boolean;
  unread: number;
  isCreator: boolean;
  onClose: () => void;
  onMessage: () => void;
  onCall: () => void;
  onAddFriend: () => void;
  onAcceptFriend: () => void;
  onKick: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  const btnBase = `h-9 flex items-center gap-1.5 px-3.5 rounded-[10px] text-[13px] font-semibold transition ${
    chillMode
      ? "bg-white/12 border border-white/20 text-white hover:brightness-110"
      : "bg-surface-2 border border-border text-foreground hover:brightness-95"
  }`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div
        ref={modalRef}
        className={`relative z-10 w-80 rounded-2xl shadow-2xl overflow-hidden ${
          chillMode ? "cg-panel border border-white/15" : "bg-surface border border-border"
        }`}
      >
        {/* Bande colorée en haut */}
        <div className="h-[72px] bg-gradient-to-br from-accent/30 via-accent/10 to-transparent" />

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 w-7 h-7 grid place-items-center rounded-lg transition ${
            chillMode ? "text-white/70 hover:bg-white/15 hover:text-white" : "text-muted hover:bg-surface-2 hover:text-foreground"
          }`}
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Corps */}
        <div className="px-5 pb-5">
          {/* Avatar chevauchant la bande */}
          <div className="-mt-10 mb-3">
            <Avatar
              url={profile?.avatar_url}
              name={name}
              identity={identity}
              isLocal={isLocal}
              size={76}
              className={`ring-4 ${chillMode ? "ring-white/10" : "ring-surface"}`}
            />
          </div>

          {/* Nom + @pseudo */}
          <h2 className="text-[18px] font-bold text-foreground leading-tight">{name}</h2>
          {profile?.username && (
            <p className={`text-[13px] mt-0.5 ${chillMode ? "text-white/55" : "text-muted"}`}>
              @{profile.username}
            </p>
          )}

          {/* Bio */}
          <div className={`mt-3.5 text-[13.5px] leading-relaxed ${chillMode ? "text-white/80" : "text-foreground/80"}`}>
            {profile?.bio ? (
              <p>{profile.bio}</p>
            ) : (
              <p className={`italic ${chillMode ? "text-white/40" : "text-muted"}`}>
                Pas de bio renseignée.
              </p>
            )}
          </div>

          {/* Membre depuis */}
          {memberSince && (
            <p className={`mt-2 text-[12px] ${chillMode ? "text-white/40" : "text-muted"}`}>
              Membre depuis {memberSince}
            </p>
          )}

          {/* Boutons d'action (non affichés pour soi-même) */}
          {!isLocal && (
            <div className="mt-4 flex items-center gap-2">
              <FriendButton
                friend={friend}
                chillMode={chillMode}
                onAdd={onAddFriend}
                onAccept={onAcceptFriend}
                large
              />

              <button
                onClick={onMessage}
                className={`${btnBase} relative`}
                title="Message privé"
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Message</span>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">
                    {unread}
                  </span>
                )}
              </button>

              {friend.state === "friends" && (
                <button
                  onClick={onCall}
                  disabled={callDisabled}
                  className={`h-9 flex items-center gap-1.5 px-3.5 rounded-[10px] text-[13px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    chillMode
                      ? "bg-white/12 border border-white/20 text-white hover:brightness-110"
                      : "bg-accent-soft border border-accent/20 text-accent hover:brightness-95"
                  }`}
                  title="Appel vocal privé"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Appel</span>
                </button>
              )}

              {isCreator && (
                <button
                  onClick={onKick}
                  className="h-9 flex items-center gap-1.5 px-3.5 rounded-[10px] text-[13px] font-semibold transition bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"
                  title="Exclure de la salle"
                >
                  <ShieldOff className="w-4 h-4 shrink-0" />
                  <span>Exclure</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bouton d'amitié ────────────────────────────────────────────────────────────

function FriendButton({
  friend, chillMode, onAdd, onAccept, large = false,
}: {
  friend: FriendInfo;
  chillMode: boolean;
  onAdd: () => void;
  onAccept: () => void;
  large?: boolean;
}) {
  const base = large
    ? `h-9 flex items-center gap-1.5 px-3.5 rounded-[10px] text-[13px] font-semibold transition shrink-0 ${
        chillMode ? "bg-white/12 border border-white/20 text-white hover:brightness-110" : "bg-surface-2 border border-border text-muted hover:brightness-95"
      }`
    : `w-8 h-8 grid place-items-center rounded-lg transition shrink-0 ${
        chillMode ? "bg-white/12 text-white border border-white/15 hover:brightness-110" : "bg-surface-2 text-muted hover:brightness-95"
      }`;

  if (friend.state === "friends") {
    return (
      <span className={`${base} !text-[#46d784] cursor-default`} title="Vous êtes amis">
        <UserCheck className="w-4 h-4" />
        {large && <span>Amis</span>}
      </span>
    );
  }
  if (friend.state === "outgoing") {
    return (
      <span className={`${base} opacity-60 cursor-default`} title="Demande d'ami envoyée">
        <Clock className="w-4 h-4" />
        {large && <span>En attente</span>}
      </span>
    );
  }
  if (friend.state === "incoming") {
    return (
      <button
        onClick={onAccept}
        className={`${large ? "h-9 flex items-center gap-1.5 px-3.5 rounded-[10px] text-[13px] font-semibold" : "w-8 h-8 grid place-items-center rounded-lg"} transition shrink-0 ${
          chillMode ? "bg-white/20 text-white border border-white/25 hover:brightness-110" : "bg-accent text-white hover:opacity-90"
        }`}
        title="Accepter la demande d'ami"
      >
        <Check className="w-4 h-4" />
        {large && <span>Accepter</span>}
      </button>
    );
  }
  return (
    <button
      onClick={onAdd}
      className={base}
      title="Ajouter en ami"
    >
      <UserPlus className="w-4 h-4" />
      {large && <span>Ajouter</span>}
    </button>
  );
}
