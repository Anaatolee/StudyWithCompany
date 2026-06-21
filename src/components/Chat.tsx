"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Profile } from "@/lib/types";

type Props = {
  roomId: string;
  currentUser: Profile;
};

export function Chat({ roomId, currentUser }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  // Initial load + realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("messages_with_author")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (!cancelled && data) setMessages((data as ChatMessage[]).reverse());
    })();

    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as {
            id: string;
            room_id: string;
            user_id: string;
            content: string;
            created_at: string;
          };

          // Postgres changes don't include the join — fetch the author.
          const { data: author } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", newMsg.user_id)
            .single();

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const next = [
              ...prev,
              {
                ...newMsg,
                username: author?.username ?? "anonyme",
                avatar_url: author?.avatar_url ?? null,
              },
            ];
            // Keep at most 100 messages displayed — drop the oldest as new ones arrive.
            return next.length > 100 ? next.slice(next.length - 100) : next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Autoscroll on new message
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    const supabase = supabaseRef.current;
    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: currentUser.id,
      content,
    });

    if (error) {
      console.error(error);
      setInput(content); // restore
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-5 pt-4 pb-2.5 text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted">
        Chat
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-3 flex flex-col gap-3"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <MessageSquare className="w-7 h-7 text-[#c4d2e0]" />
            <p className="text-[14px] leading-[1.5] text-muted max-w-[200px]">
              Soit le premier à dire bonjour&nbsp;!
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              isOwn={m.user_id === currentUser.id}
            />
          ))
        )}
      </div>

      <form
        onSubmit={send}
        className="border-t border-border px-4 py-3"
      >
        <div className="flex items-center gap-2 bg-[#eef3f8] border border-border rounded-xl pl-3.5 pr-1.5 py-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrire un message…"
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

function MessageRow({
  message,
  isOwn,
}: {
  message: ChatMessage;
  isOwn: boolean;
}) {
  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      <span
        className={`text-[11.5px] font-bold mb-1 ${isOwn ? "text-accent" : "text-[#7a9cbd]"}`}
      >
        {isOwn ? "Vous" : message.username}
      </span>
      <div
        className={`max-w-[240px] px-[13px] py-[9px] text-[14px] leading-[1.45] rounded-[13px] ${
          isOwn
            ? "bg-accent text-white rounded-tr-[4px]"
            : "bg-[#eef3f8] text-foreground rounded-tl-[4px]"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
