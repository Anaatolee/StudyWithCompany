"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DirectMessage, Profile } from "@/lib/types";

type Props = {
  roomId: string;
  currentUser: Profile;
  peer: { userId: string; username: string };
  onBack: () => void;
};

export function DirectMessagePanel({ roomId, currentUser, peer, onBack }: Props) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("room_id", roomId)
        .or(
          `and(from_id.eq.${currentUser.id},to_id.eq.${peer.userId}),and(from_id.eq.${peer.userId},to_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true })
        .limit(100);

      if (!cancelled && data) setMessages(data as DirectMessage[]);
    })();

    const channel = supabase
      .channel(`dm:${roomId}:${[currentUser.id, peer.userId].sort().join(":")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as DirectMessage;
          const relevant =
            (msg.from_id === currentUser.id && msg.to_id === peer.userId) ||
            (msg.from_id === peer.userId && msg.to_id === currentUser.id);
          if (!relevant) return;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUser.id, peer.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    const { error } = await supabase.from("direct_messages").insert({
      room_id: roomId,
      from_id: currentUser.id,
      to_id: peer.userId,
      content,
    });
    if (error) { console.error(error); setInput(content); }
    setSending(false);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <button onClick={onBack} className="p-1 rounded hover:bg-background transition" title="Retour au chat">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs uppercase tracking-wide text-muted truncate">
          Message privé — {peer.username}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted text-center mt-6">Commencez la conversation.</p>
        ) : (
          messages.map((m) => {
            const isOwn = m.from_id === currentUser.id;
            const time = new Date(m.created_at).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div key={m.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                <div className="flex items-baseline gap-2 text-xs text-muted mb-0.5">
                  <span className="font-medium text-foreground/80">
                    {isOwn ? "Vous" : peer.username}
                  </span>
                  <span>{time}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                    isOwn
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-background border border-border rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 p-2 border-t border-border bg-surface">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message à ${peer.username}…`}
          maxLength={2000}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-sm"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-accent text-white p-2 rounded-lg disabled:opacity-40"
          title="Envoyer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
