"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { LiveKitRoom } from "@livekit/components-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, Trash2, Users, Video, VideoOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Room as StudyRoom, Subject } from "@/lib/types";
import { Chat } from "./Chat";
import { Controls } from "./Controls";
import { DirectMessagePanel } from "./DirectMessagePanel";
import { LofiPlayer } from "./LofiPlayer";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { PomodoroTimer } from "./PomodoroTimer";
import { SharedPomodoroTimer } from "./SharedPomodoroTimer";
import { VideoGrid } from "./VideoGrid";
import { IncomingCallToast, type IncomingInvite } from "./IncomingCallToast";
import { DmToast, type DmNotification } from "./DmToast";
import { PrivateCallModal, type PrivateCallInfo } from "./PrivateCallModal";
import { ChillModeContext, type ChillModeState } from "./ChillModeContext";
import { ChillBackground } from "./ChillBackground";
import { FriendRequestNotifier } from "./FriendRequestNotifier";
import type { DirectMessage } from "@/lib/types";
import { display, body } from "@/app/fonts";
import { DarkModeToggle } from "@/components/DarkModeToggle";

type Props = {
  room: StudyRoom;
  subject: Subject;
  currentUser: Profile;
};

type JoinState =
  | { status: "loading" }
  | { status: "ready"; token: string; url: string }
  | { status: "error"; message: string };

export function StudyRoomClient({ room, subject, currentUser }: Props) {
  const [join, setJoin] = useState<JoinState>({ status: "loading" });
  const [lkRoom] = useState(() => new Room());
  const [activeCall, setActiveCall] = useState<PrivateCallInfo | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
  const [activeDm, setActiveDm] = useState<{ userId: string; username: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const activeDmRef = useRef<{ userId: string; username: string } | null>(null);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inviteChannelRef = useRef<RealtimeChannel | null>(null);
  const activeCallRef = useRef<PrivateCallInfo | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [dmToast, setDmToast] = useState<DmNotification | null>(null);
  const usernameCache = useRef<Map<string, string>>(new Map());

  // Chill Mode : fond animé, design liquid glass, tuiles caméra masquées.
  const [chillMode, setChillMode] = useState(false);
  const [showTilesInChill, setShowTilesInChill] = useState(false);

  // À l'entrée en chill, le chat passe tout de suite en flottant (la zone vidéo
  // s'élargit donc à pleine largeur). Pour éviter que les tuiles « se recentrent »
  // pendant qu'elles disparaissent en fondu, on réserve l'espace à droite (≈ largeur
  // de l'ancien panneau) le temps du fondu, puis on le retire (tuiles déjà invisibles).
  const [chillEntering, setChillEntering] = useState(false);
  useEffect(() => {
    if (!chillEntering) return;
    const t = setTimeout(() => setChillEntering(false), 400); // > fondu des tuiles (360ms)
    return () => clearTimeout(t);
  }, [chillEntering]);

  // Bascule du mode. Entrer en chill masque les tuiles par défaut.
  // Apparition/disparition toujours en fondu (cf. VideoGrid).
  // On fixe chillEntering dans le même batch que chillMode → pas de frame
  // intermédiaire où la zone vidéo s'élargit sans l'espace réservé.
  function toggleChill() {
    const next = !chillMode;
    setChillMode(next);
    if (next) {
      setShowTilesInChill(false);
      setChillEntering(true);
    }
  }

  // Affiche/masque les tuiles en plein chill (fondu).
  function toggleTilesInChill() {
    setShowTilesInChill((v) => !v);
  }

  const chillValue = useMemo<ChillModeState>(
    () => ({
      chillMode,
      tilesVisible: chillMode ? showTilesInChill : true,
    }),
    [chillMode, showTilesInChill]
  );

  const isCreator = currentUser.id === room.created_by;

  async function handleDeleteRoom() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    await lkRoom.disconnect();
    await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    router.push("/rooms");
  }

  const copyInviteLink = useCallback(() => {
    const url = `${window.location.origin}/rooms/${room.id}?invite=${room.invite_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [room.id, room.invite_token]);

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { activeDmRef.current = activeDm; }, [activeDm]);

  function openDm(userId: string, username: string) {
    setActiveDm({ userId, username });
    setUnreadCounts((prev) => ({ ...prev, [userId]: 0 }));
  }

  // Fetch LiveKit token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: room.id }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { token, url } = (await res.json()) as { token: string; url: string };
        if (!cancelled) setJoin({ status: "ready", token, url });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setJoin({ status: "error", message });
      }
    })();
    return () => { cancelled = true; };
  }, [room.id]);

  useEffect(() => () => { lkRoom.disconnect(); }, [lkRoom]);

  // Partage l'état Chill Mode aux autres participants via un attribut LiveKit.
  // Les tuiles distantes lisent cet attribut pour afficher le badge « Chill mode »
  // uniquement sur les personnes réellement en chill (pas sur tout le monde).
  useEffect(() => {
    if (join.status !== "ready") return;
    const sync = () => {
      lkRoom.localParticipant
        .setAttributes({ chill: chillMode ? "1" : "0" })
        .catch(() => { /* pas encore connecté : re-tenté à l'événement Connected */ });
    };
    sync();
    lkRoom.on(RoomEvent.Connected, sync);
    return () => { lkRoom.off(RoomEvent.Connected, sync); };
  }, [chillMode, join.status, lkRoom]);

  // Study session tracking (stats & streaks). Starts a session on join, keeps it
  // alive with a heartbeat, and sends a final beat on leave / tab close.
  const studySessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (join.status !== "ready") return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const beat = () => {
      const id = studySessionIdRef.current;
      if (!id) return;
      fetch("/api/study/session/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
        keepalive: true,
      }).catch(() => {});
    };

    (async () => {
      try {
        const res = await fetch("/api/study/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: room.id }),
        });
        if (!res.ok) return;
        const { sessionId } = (await res.json()) as { sessionId: string };
        if (cancelled) return;
        studySessionIdRef.current = sessionId;
        interval = setInterval(beat, 60000);
      } catch { /* ignore — stats are best-effort */ }
    })();

    const onHide = () => beat();
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onHide);
      if (interval) clearInterval(interval);
      beat(); // final touch so the last minute counts
    };
  }, [join.status, room.id]);

  // Subscribe to private-call invite broadcasts
  useEffect(() => {
    const channel = supabase.channel(`call-invites:${room.id}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "invite" }, (msg) => {
      const payload = msg.payload as IncomingInvite & { toUserId: string };
      if (payload.toUserId !== currentUser.id) return;
      if (activeCallRef.current) return;
      setIncomingInvite({
        roomName: payload.roomName,
        fromUserId: payload.fromUserId,
        fromUsername: payload.fromUsername,
      });
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") inviteChannelRef.current = channel;
    });
    return () => {
      inviteChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [supabase, room.id, currentUser.id]);

  // Listen for incoming DMs to update unread badges + show toast
  useEffect(() => {
    const channel = supabase
      .channel(`dm-incoming:${room.id}:${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `room_id=eq.${room.id}` },
        async (payload) => {
          const msg = payload.new as DirectMessage;
          if (msg.to_id !== currentUser.id) return;
          if (activeDmRef.current?.userId === msg.from_id) return;
          setUnreadCounts((prev) => ({ ...prev, [msg.from_id]: (prev[msg.from_id] ?? 0) + 1 }));

          // Resolve sender username (cache to avoid repeated fetches)
          let fromUsername: string = usernameCache.current.get(msg.from_id) ?? "";
          if (!fromUsername) {
            const { data } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", msg.from_id)
              .single();
            fromUsername = (data?.username as string | undefined) ?? "Quelqu'un";
            usernameCache.current.set(msg.from_id, fromUsername);
          }

          setDmToast({ fromId: msg.from_id, fromUsername, preview: msg.content });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, room.id, currentUser.id]);

  async function initiateCall(peerUserId: string, peerName: string) {
    if (activeCall) return;
    try {
      const res = await fetch("/api/livekit/private-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerUserId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { roomName, token } = (await res.json()) as { roomName: string; token: string };
      await inviteChannelRef.current?.send({
        type: "broadcast",
        event: "invite",
        payload: {
          roomName,
          fromUserId: currentUser.id,
          fromUsername: currentUser.username,
          toUserId: peerUserId,
        },
      });
      setActiveCall({ roomName, token, peerName });
    } catch (err) {
      console.error("Failed to initiate private call:", err);
    }
  }

  async function acceptInvite() {
    if (!incomingInvite) return;
    try {
      const res = await fetch("/api/livekit/private-call/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: incomingInvite.roomName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { token } = (await res.json()) as { token: string };
      setActiveCall({ roomName: incomingInvite.roomName, token, peerName: incomingInvite.fromUsername });
      setIncomingInvite(null);
    } catch (err) {
      console.error("Failed to accept invite:", err);
    }
  }

  return (
    <ChillModeContext.Provider value={chillValue}>
    <div
      className={`${display.variable} ${body.variable} relative h-screen flex flex-col overflow-hidden text-foreground ${chillMode ? "chill-mode" : "bg-background"}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <ChillBackground active={chillMode} />

      {/* Header */}
      <header className="cg-header relative z-20 flex-none flex items-center gap-[18px] px-5 py-[11px] border-b border-border bg-background/80 backdrop-blur-[10px]">
        <Link
          href="/rooms"
          className="cg-ghost w-[34px] h-[34px] grid place-items-center rounded-[9px] border border-border bg-surface text-muted hover:bg-border/50 transition shrink-0"
          title="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Identité de salle */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#3f9d6a] lp-pulse shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-[18px] leading-tight truncate">{room.name}</h1>
            <p className="text-[12px] font-medium text-muted truncate">{subject.name}</p>
          </div>
        </div>

        {/* Objectif */}
        {room.study_goal && (
          <div className="hidden lg:flex items-center gap-2 min-w-0 border-l border-foreground/20 pl-4 shrink-0">
            <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-accent shrink-0">Objectif</span>
            <span className="text-[16px] font-semibold truncate max-w-[160px]">{room.study_goal}</span>
          </div>
        )}

        {/* Espaceur : pousse les chips d'action à droite (le groupe central est en absolu, plus bas) */}
        <div className="flex-1" />

        {/* Chips de statut + actions */}
        <div className="flex items-center gap-3 text-[12.5px] font-medium text-muted shrink-0">
          {chillMode && (
            <button
              onClick={toggleTilesInChill}
              className={`cg-chill-toggle ${showTilesInChill ? "is-active" : ""}`}
              title={showTilesInChill ? "Masquer les caméras" : "Afficher les caméras"}
            >
              {showTilesInChill ? <Video className="w-[15px] h-[15px]" /> : <VideoOff className="w-[15px] h-[15px]" />}
              <span className="hidden lg:inline">{showTilesInChill ? "Masquer" : "Caméras"}</span>
            </button>
          )}
          <button
            onClick={() => setShowParticipants((v) => !v)}
            disabled={join.status !== "ready"}
            className={`flex items-center gap-1.5 px-3 py-[7px] rounded-[9px] border text-[13px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              showParticipants
                ? "bg-accent text-white border-accent"
                : "cg-ghost bg-surface border-border text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
            title="Voir les participants"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Participants</span>
          </button>
          <DarkModeToggle className="cg-ghost" />
          {!room.is_public && (
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-border/50 transition"
              title="Copier le lien d'invitation"
            >
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">{linkCopied ? "Copié !" : "Lien d'invitation"}</span>
            </button>
          )}
          {isCreator && (
            <button
              onClick={handleDeleteRoom}
              disabled={deleting}
              onBlur={() => setDeleteConfirm(false)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition ${
                deleteConfirm
                  ? "bg-[#b03a3a] text-white"
                  : "text-[#b03a3a] hover:bg-[#b03a3a]/10"
              }`}
              title="Supprimer la salle"
            >
              <Trash2 className="w-4 h-4" />
              {/* Grille : un placeholder invisible « Confirmer ? » réserve toujours la
                  largeur du plus long libellé → pas de décalage horizontal des voisins,
                  et le texte tient sur une seule ligne (pas de décalage vertical). */}
              <span className="hidden sm:grid text-left whitespace-nowrap">
                <span className="col-start-1 row-start-1 invisible" aria-hidden>
                  Confirmer&nbsp;?
                </span>
                <span className="col-start-1 row-start-1">
                  {deleteConfirm ? "Confirmer ?" : "Supprimer"}
                </span>
              </span>
            </button>
          )}
        </div>

        {/* ── Groupe central, ancré au CENTRE par le bouton Chill (largeur fixe) ──
            Le bouton ne change pas de taille entre « Chill mode » / « Serious mode ».
            Le lecteur est ancré à droite (il grandit donc vers la GAUCHE quand le titre
            est long, sans rien décaler à droite). Le pomodoro est ancré à gauche (fixe).
            Placé après les chips pour passer au-dessus en cas de léger chevauchement. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
          <button
            onClick={toggleChill}
            className={`cg-chill-toggle justify-center ${chillMode ? "is-active" : ""}`}
            style={{ width: 142 }}
            title={chillMode ? "Revenir au mode sérieux" : "Activer le Chill Mode"}
          >
            {chillMode ? "Serious mode" : "Chill mode"}
          </button>
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 hidden md:flex justify-end"
          style={{ right: "calc(50% + 87px)" }}
        >
          <LofiPlayer compact />
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 hidden md:flex"
          style={{ left: "calc(50% + 87px)" }}
        >
          {room.pomodoro_enabled
            ? <SharedPomodoroTimer room={room} isCreator={isCreator} compact />
            : <PomodoroTimer compact />
          }
        </div>
      </header>

      {/* Loading / Error states (no LiveKit context needed) */}
      {join.status === "loading" && (
        <div className="flex-1 flex items-center justify-center text-muted">
          Connexion à la salle...
        </div>
      )}
      {join.status === "error" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <p className="text-red-300 mb-2 font-medium">Erreur de connexion</p>
            <p className="text-sm text-muted">{join.message}</p>
          </div>
        </div>
      )}

      {/* LiveKit room — wraps both video area and sidebar so hooks share context */}
      {join.status === "ready" && (
        <LiveKitRoom
          room={lkRoom}
          token={join.token}
          serverUrl={join.url}
          connect={true}
          audio={false}
          video={true}
          className="relative z-10 flex-1 flex flex-col md:flex-row min-h-0"
        >
          {/* Scène vidéo + dock flottant.
              Pendant l'entrée en chill, on réserve à droite la largeur de l'ancien
              panneau pour que les tuiles ne bougent pas en disparaissant. */}
          <main className={`relative flex-1 flex flex-col min-h-0 ${chillEntering ? "md:pr-[340px]" : ""}`}>
            <VideoGrid />
            <Controls onLeave={() => lkRoom.disconnect()} />
          </main>

          {/* Panneau latéral : chat ou DM, recouvert par les participants au besoin.
              En chill, conteneur transparent flottant en bas à droite : le chat général
              devient des bulles flottantes + une barre glass, tandis que les menus DM /
              participants s'affichent en carte « liquid glass ». */}
          <aside
            className={
              chillMode
                ? // chill flottant : menu Participants en pleine hauteur, sinon chat en bas à droite
                  showParticipants
                  ? "absolute top-4 bottom-4 right-4 z-30 w-[340px] flex flex-col"
                  : "absolute bottom-4 right-4 z-30 w-[340px] h-[60vh] flex flex-col"
                : "relative w-full md:w-[340px] border-t md:border-t-0 md:border-l border-border bg-surface flex flex-col min-h-0 md:max-h-none max-h-[60vh] shrink-0"
            }
          >
            {/* Le chat/DM disparaît quand le menu Participants est ouvert (sinon illisible en glass) */}
            {showParticipants ? (
              <ParticipantsPanel
                currentUserId={currentUser.id}
                onCall={(id, name) => { initiateCall(id, name); setShowParticipants(false); }}
                callDisabled={!!activeCall}
                onMessage={(id, name) => { openDm(id, name); setShowParticipants(false); }}
                unreadCounts={unreadCounts}
                onClose={() => setShowParticipants(false)}
              />
            ) : activeDm ? (
              <DirectMessagePanel
                roomId={room.id}
                currentUser={currentUser}
                peer={activeDm}
                onBack={() => setActiveDm(null)}
              />
            ) : (
              <Chat roomId={room.id} currentUser={currentUser} />
            )}
          </aside>
        </LiveKitRoom>
      )}

      {dmToast && (
        <DmToast
          notification={dmToast}
          onReply={() => openDm(dmToast.fromId, dmToast.fromUsername)}
          onClose={() => setDmToast(null)}
        />
      )}
      {incomingInvite && !activeCall && (
        <IncomingCallToast
          invite={incomingInvite}
          onAccept={acceptInvite}
          onDecline={() => setIncomingInvite(null)}
        />
      )}
      {activeCall && (
        <PrivateCallModal info={activeCall} onClose={() => setActiveCall(null)} />
      )}
      <FriendRequestNotifier currentUserId={currentUser.id} />
    </div>
    </ChillModeContext.Provider>
  );
}
