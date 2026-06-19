"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room } from "livekit-client";
import { LiveKitRoom } from "@livekit/components-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, MicOff, Trash2, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Room as StudyRoom, Subject } from "@/lib/types";
import { Chat } from "./Chat";
import { Controls } from "./Controls";
import { LofiPlayer } from "./LofiPlayer";
import { ParticipantList } from "./ParticipantList";
import { PomodoroTimer } from "./PomodoroTimer";
import { SharedPomodoroTimer } from "./SharedPomodoroTimer";
import { VideoGrid } from "./VideoGrid";
import { IncomingCallToast, type IncomingInvite } from "./IncomingCallToast";
import { PrivateCallModal, type PrivateCallInfo } from "./PrivateCallModal";

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

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inviteChannelRef = useRef<RealtimeChannel | null>(null);
  const activeCallRef = useRef<PrivateCallInfo | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 bg-surface">
        <Link href="/rooms" className="p-1.5 rounded-md hover:bg-background transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: subject.color }} />
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{room.name}</h1>
            <p className="text-xs text-muted truncate">{subject.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="hidden md:flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Caméra recommandée</span>
          <span className="hidden md:flex items-center gap-1"><MicOff className="w-3.5 h-3.5" /> Micro verrouillé</span>
          {!room.is_public && (
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-surface transition"
              title="Copier le lien d'invitation"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{linkCopied ? "Copié !" : "Lien d'invitation"}</span>
            </button>
          )}
          {isCreator && (
            <button
              onClick={handleDeleteRoom}
              disabled={deleting}
              onBlur={() => setDeleteConfirm(false)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition text-xs ${
                deleteConfirm
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "hover:bg-background text-muted hover:text-red-400"
              }`}
              title="Supprimer la salle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {deleteConfirm ? "Confirmer ?" : "Supprimer"}
              </span>
            </button>
          )}
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
          className="flex-1 flex flex-col md:flex-row min-h-0"
        >
          {/* Video + controls */}
          <main className="flex-1 flex flex-col min-h-0">
            <VideoGrid />
            <Controls onLeave={() => lkRoom.disconnect()} />
          </main>

          {/* Sidebar: participants + chat */}
          <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-surface flex flex-col min-h-0 md:max-h-none max-h-[60vh]">
            {room.study_goal && (
              <div className="px-3 py-2 border-b border-border flex items-start gap-2 text-xs">
                <span className="text-accent font-semibold shrink-0 mt-0.5">Objectif</span>
                <span className="text-muted leading-relaxed">{room.study_goal}</span>
              </div>
            )}
            <ParticipantList onCall={initiateCall} callDisabled={!!activeCall} />
            {room.pomodoro_enabled
              ? <SharedPomodoroTimer room={room} isCreator={isCreator} />
              : <PomodoroTimer />
            }
            <LofiPlayer />
            <Chat roomId={room.id} currentUser={currentUser} />
          </aside>
        </LiveKitRoom>
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
    </div>
  );
}
