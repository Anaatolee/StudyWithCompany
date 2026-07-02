"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, MessageSquare, Search, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Avatar } from "@/components/Avatar";
import type { DirectMessage, Profile } from "@/lib/types";

type Conversation = {
  peerId: string;
  username: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  roomId: string; // salle du dernier message → contexte de réponse (room_id NOT NULL)
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function ConversationsDashboard({ currentUser }: { currentUser: Profile }) {
  const supabase = useRef(createClient()).current;
  const uid = currentUser.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.peerId === selectedId) ?? null;

  // ── Charge la liste des conversations (dernier message par interlocuteur) ──
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`from_id.eq.${uid},to_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = (data ?? []) as DirectMessage[];
    // Premier message rencontré (ordre décroissant) = le plus récent, par pair.
    const byPeer = new Map<string, { lastMessage: string; lastAt: string; roomId: string }>();
    for (const m of rows) {
      const peerId = m.from_id === uid ? m.to_id : m.from_id;
      if (!byPeer.has(peerId)) {
        byPeer.set(peerId, { lastMessage: m.content, lastAt: m.created_at, roomId: m.room_id });
      }
    }

    const peerIds = [...byPeer.keys()];
    if (peerIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", peerIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const convs: Conversation[] = peerIds.map((peerId) => {
      const info = byPeer.get(peerId)!;
      const prof = profileMap.get(peerId);
      return {
        peerId,
        username: prof?.username ?? "Utilisateur",
        avatarUrl: prof?.avatar_url ?? null,
        lastMessage: info.lastMessage,
        lastAt: info.lastAt,
        roomId: info.roomId,
      };
    });
    convs.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    setConversations(convs);
    setLoading(false);
  }, [supabase, uid]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Charge le fil complet avec l'interlocuteur sélectionné (toutes salles) ──
  useEffect(() => {
    if (!selectedId) { setThread([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(from_id.eq.${uid},to_id.eq.${selectedId}),and(from_id.eq.${selectedId},to_id.eq.${uid})`
        )
        .order("created_at", { ascending: true })
        .limit(300);
      if (!cancelled) setThread((data ?? []) as DirectMessage[]);
    })();
    return () => { cancelled = true; };
  }, [selectedId, supabase, uid]);

  // ── Temps réel : nouveaux DMs (RLS limite déjà aux miens) ──
  useEffect(() => {
    const channel = supabase
      .channel(`conversations:${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const msg = payload.new as DirectMessage;
          if (msg.from_id !== uid && msg.to_id !== uid) return;
          // Met à jour le fil ouvert
          const peerId = msg.from_id === uid ? msg.to_id : msg.from_id;
          if (peerId === selectedId) {
            setThread((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
          // Rafraîchit la liste (dernier message / ordre)
          loadConversations();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, uid, selectedId, loadConversations]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !selected) return;

    // Envoi optimiste : le message apparaît tout de suite (id client dédupliqué par le realtime).
    const id = crypto.randomUUID();
    const optimistic: DirectMessage = {
      id,
      room_id: selected.roomId,
      from_id: uid,
      to_id: selected.peerId,
      content,
      created_at: new Date().toISOString(),
    };
    setThread((prev) => [...prev, optimistic]);
    setInput("");

    const { error } = await supabase.from("direct_messages").insert({
      id,
      room_id: selected.roomId,
      from_id: uid,
      to_id: selected.peerId,
      content,
    });
    if (error) {
      setThread((prev) => prev.filter((m) => m.id !== id));
      setInput(content);
    } else {
      loadConversations();
    }
  }

  const q = search.trim().toLowerCase();
  const visibleConvs = q
    ? conversations.filter((c) => c.username.toLowerCase().includes(q))
    : conversations;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1000px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/rooms" className="flex items-center gap-[11px]">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-accent grid place-items-center">
              <BookOpen className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </span>
            <span className="font-display font-bold text-[20px] tracking-[-0.01em]">StudyWithCompany</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/rooms"
              className="flex items-center gap-1.5 text-muted font-semibold text-[14.5px] px-3 py-2 rounded-[9px] hover:bg-surface-2 hover:text-foreground transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-7 pt-[clamp(20px,3vw,32px)] pb-8">
        <h1 className="font-display font-bold text-[clamp(26px,4vw,36px)] leading-[1.05] tracking-[-0.025em] mb-6">
          Conversations
        </h1>

        <div className="flex gap-5 h-[calc(100vh-220px)] min-h-[420px]">
          {/* ── Liste des conversations ── */}
          <div className={`w-full md:w-[330px] shrink-0 bg-surface border border-border rounded-2xl flex flex-col overflow-hidden ${selected ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full bg-surface-2 border border-border rounded-[10px] pl-9 pr-3 py-2 text-[14px] text-foreground placeholder:text-muted outline-none focus:border-accent transition"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              {loading ? (
                <p className="text-center text-muted text-[14px] py-10">Chargement…</p>
              ) : visibleConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-4">
                  <MessageSquare className="w-7 h-7 text-border" />
                  <p className="text-[14px] text-muted">Aucune conversation pour l&apos;instant.</p>
                </div>
              ) : (
                visibleConvs.map((c) => (
                  <button
                    key={c.peerId}
                    onClick={() => setSelectedId(c.peerId)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-[11px] text-left transition ${
                      selectedId === c.peerId ? "bg-accent-soft" : "hover:bg-surface-2"
                    }`}
                  >
                    <Avatar url={c.avatarUrl} name={c.username} identity={c.peerId} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14.5px] font-semibold text-foreground truncate">{c.username}</span>
                        <span className="text-[11.5px] text-muted shrink-0">{formatWhen(c.lastAt)}</span>
                      </div>
                      <p className="text-[13px] text-muted truncate">{c.lastMessage}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Fil de la conversation sélectionnée ── */}
          <div className={`flex-1 bg-surface border border-border rounded-2xl flex-col overflow-hidden ${selected ? "flex" : "hidden md:flex"}`}>
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted">
                <MessageSquare className="w-9 h-9 text-border" />
                <p className="text-[15px]">Sélectionne une conversation pour l&apos;afficher.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden w-7 h-7 grid place-items-center rounded-lg text-muted hover:bg-surface-2 transition"
                    title="Retour"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Avatar url={selected.avatarUrl} name={selected.username} identity={selected.peerId} size={34} />
                  <span className="font-semibold text-[15px] text-foreground truncate">{selected.username}</span>
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 flex flex-col gap-3">
                  {thread.length === 0 ? (
                    <p className="text-[14px] text-muted text-center mt-6">Commencez la conversation.</p>
                  ) : (
                    thread.map((m) => {
                      const isOwn = m.from_id === uid;
                      return (
                        <div key={m.id} className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                          <Avatar
                            url={isOwn ? currentUser.avatar_url : selected.avatarUrl}
                            name={isOwn ? currentUser.username : selected.username}
                            identity={isOwn ? uid : selected.peerId}
                            isLocal={isOwn}
                            size={28}
                            className="mb-[2px]"
                          />
                          <div className={`flex flex-col min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
                            <div
                              className={`max-w-[300px] px-[13px] py-[9px] text-[14px] leading-[1.45] rounded-[13px] break-words whitespace-pre-wrap ${
                                isOwn ? "bg-accent text-white rounded-tr-[4px]" : "bg-surface-2 text-foreground rounded-tl-[4px]"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={send} className="px-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2 rounded-xl pl-3.5 pr-1.5 py-1.5 border bg-surface-2 border-border">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Message à ${selected.username}…`}
                      maxLength={2000}
                      className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="w-9 h-9 grid place-items-center bg-accent text-white rounded-[9px] shadow-[0_4px_10px_rgba(47,125,196,.3)] disabled:opacity-40 transition"
                      title="Envoyer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
