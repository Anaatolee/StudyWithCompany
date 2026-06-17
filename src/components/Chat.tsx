"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
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
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted border-b border-border">
        Chat
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted text-center mt-6">
            Soyez le premier à dire bonjour à la salle.
          </p>
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
        className="flex items-center gap-2 p-2 border-t border-border bg-surface"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrire un message..."
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

function MessageRow({
  message,
  isOwn,
}: {
  message: ChatMessage;
  isOwn: boolean;
}) {
  const time = new Date(message.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      <div className="flex items-baseline gap-2 text-xs text-muted mb-0.5">
        <span className="font-medium text-foreground/80">
          {isOwn ? "Vous" : message.username}
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
        {message.content}
      </div>
    </div>
  );
}
