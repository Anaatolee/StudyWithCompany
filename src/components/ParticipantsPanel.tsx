"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import {
  Check, Clock, Flag, MessageSquare, Phone, Search, ShieldOff, UserCheck, UserPlus, Users, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useChillMode } from "./ChillModeContext";
import { Avatar } from "./Avatar";
import { PeerStatusDot, StatusDot, STATUS_META } from "./status/StatusIndicator";
import type { Friendship, FriendState, UserStatus } from "@/lib/types";

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
  status: UserStatus | null;
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
        .select("id, avatar_url, bio, username, created_at, status")
        .in("id", ids);
      if (cancelled || !data) return;
      const map: Record<string, PeerProfile> = {};
      for (const row of data) {
        map[row.id] = {
          avatar_url: row.avatar_url,
          bio: row.bio,
          username: row.username,
          created_at: row.created_at,
          status: row.status as UserStatus | null,
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-[14.5px] font-semibold text-foreground truncate">
                      {name}
                      {isLocal && <span className="font-medium text-muted"> (vous)</span>}
                    </p>
                    {isLocal ? (
                      <StatusDot status={profile?.status ?? "online"} size={9} title={STATUS_META[profile?.status ?? "online"].label} />
                    ) : (
                      <PeerStatusDot status={profile?.status} size={9} />
                    )}
                  </div>
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
          reportedUserId={selectedEntry.p.identity}
          roomId={roomId}
        />,
        document.body,
      )}
    </div>
  );
}

// ── Modal de profil ────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  "Comportement offensant ou agressif",
  "Harcèlement",
  "Spam ou publicité",
  "Contenu inapproprié",
  "Usurpation d'identité",
  "Autre",
];

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
  reportedUserId,
  roomId,
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
  reportedUserId: string;
  roomId: string;
  onClose: () => void;
  onMessage: () => void;
  onCall: () => void;
  onAddFriend: () => void;
  onAcceptFriend: () => void;
  onKick: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [reportView, setReportView] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDesc, setReportDesc] = useState("");
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (reportView) { setReportView(false); return; }
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, reportView]);

  async function submitReport() {
    setReportStatus("sending");
    setReportError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId, reason: reportReason, description: reportDesc, roomId }),
    });
    if (res.ok) {
      setReportStatus("done");
    } else {
      const data = await res.json().catch(() => ({}));
      setReportError(data.error || "Une erreur est survenue.");
      setReportStatus("error");
    }
  }

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

        {/* Boutons signaler + exclure — à la limite bande/blanc */}
        {!isLocal && (
          <div className="absolute right-3 top-[76px] flex items-center gap-1">
            <button
              onClick={() => setReportView(true)}
              className={`w-7 h-7 grid place-items-center rounded-lg transition ${
                chillMode ? "text-white/50 hover:bg-white/15 hover:text-white" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
              title="Signaler cet utilisateur"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
            {isCreator && (
              <button
                onClick={onKick}
                className={`w-7 h-7 grid place-items-center rounded-lg transition ${
                  chillMode ? "text-red-400/70 hover:bg-white/15 hover:text-red-400" : "text-red-400/70 hover:bg-red-50 hover:text-red-500"
                }`}
                title="Exclure de la salle"
              >
                <ShieldOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

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

          {/* Nom + pastille de statut + @pseudo */}
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold text-foreground leading-tight truncate">{name}</h2>
            {isLocal ? (
              <StatusDot status={profile?.status ?? "online"} size={10} title={STATUS_META[profile?.status ?? "online"].label} />
            ) : (
              <PeerStatusDot status={profile?.status} size={10} />
            )}
          </div>
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

            </div>
          )}

          {/* Formulaire de signalement */}
          {reportView && !isLocal && (
            <div className={`mt-4 rounded-xl p-4 border text-[13px] ${chillMode ? "bg-white/8 border-white/15" : "bg-surface-2 border-border"}`}>
              {reportStatus === "done" ? (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <Check className="w-6 h-6 text-[#2ecc71]" />
                  <p className={`font-semibold ${chillMode ? "text-white" : "text-foreground"}`}>Signalement envoyé</p>
                  <p className={`text-[12px] ${chillMode ? "text-white/55" : "text-muted"}`}>Merci, nous examinerons ce signalement.</p>
                  <button onClick={onClose} className="mt-1 text-accent hover:underline text-[12.5px]">Fermer</button>
                </div>
              ) : (
                <>
                  <p className={`font-semibold mb-3 ${chillMode ? "text-white" : "text-foreground"}`}>Signaler {name}</p>

                  <label className={`block text-[12px] font-semibold mb-1.5 ${chillMode ? "text-white/60" : "text-muted"}`}>Motif</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-[13px] outline-none border mb-3 ${
                      chillMode ? "bg-white/10 border-white/20 text-white" : "bg-background border-border text-foreground"
                    }`}
                  >
                    {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>

                  <label className={`block text-[12px] font-semibold mb-1.5 ${chillMode ? "text-white/60" : "text-muted"}`}>Détails <span className="font-normal">(optionnel)</span></label>
                  <textarea
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Décrivez le problème…"
                    className={`w-full rounded-lg px-3 py-2 text-[13px] outline-none border resize-none mb-3 ${
                      chillMode ? "bg-white/10 border-white/20 text-white placeholder:text-white/35" : "bg-background border-border text-foreground placeholder:text-muted"
                    }`}
                  />

                  {reportError && <p className="text-[12px] text-red-400 mb-2">{reportError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={submitReport}
                      disabled={reportStatus === "sending"}
                      className="flex-1 h-8 rounded-lg text-[13px] font-semibold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
                    >
                      {reportStatus === "sending" ? "Envoi…" : "Envoyer"}
                    </button>
                    <button
                      onClick={() => { setReportView(false); setReportError(""); setReportStatus("idle"); }}
                      className={`h-8 px-3 rounded-lg text-[13px] font-semibold transition ${chillMode ? "bg-white/12 text-white hover:brightness-110" : "bg-surface border border-border text-muted hover:brightness-95"}`}
                    >
                      Annuler
                    </button>
                  </div>
                </>
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
