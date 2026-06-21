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
      <div className="flex items-center gap-2 px-4 pt-4 pb-2.5">
        <button onClick={onBack} className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:bg-[#eef3f8] transition" title="Retour au chat">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted truncate">
          Message privé — {peer.username}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-3 flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-[14px] text-muted text-center mt-6">Commencez la conversation.</p>
        ) : (
          messages.map((m) => {
            const isOwn = m.from_id === currentUser.id;
            return (
              <div key={m.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                <span className={`text-[11.5px] font-bold mb-1 ${isOwn ? "text-accent" : "text-[#7a9cbd]"}`}>
                  {isOwn ? "Vous" : peer.username}
                </span>
                <div
                  className={`max-w-[240px] px-[13px] py-[9px] text-[14px] leading-[1.45] rounded-[13px] ${
                    isOwn
                      ? "bg-accent text-white rounded-tr-[4px]"
                      : "bg-[#eef3f8] text-foreground rounded-tl-[4px]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 bg-[#eef3f8] border border-border rounded-xl pl-3.5 pr-1.5 py-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message à ${peer.username}…`}
            maxLength={2000}
            className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-[#97a1ad]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-9 h-9 grid place-items-center bg-accent text-white rounded-[9px] shadow-[0_4px_10px_rgba(47,125,196,.3)] disabled:opacity-40 transition"
            title="Envoyer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
