"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

type Toast = { rowId: string; username: string; avatarUrl: string | null; requesterId: string };

// Écoute en temps réel les demandes d'ami reçues et affiche un toast in-app.
// Monté sur les surfaces authentifiées (dashboard + salle d'étude).
export function FriendRequestNotifier({ currentUserId }: { currentUserId: string }) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`friend-req-notif:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const row = payload.new as { id: string; requester_id: string; status: string };
          if (row.status !== "pending") return;
          const { data } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", row.requester_id)
            .single();
          setToast({
            rowId: row.id,
            requesterId: row.requester_id,
            username: data?.username ?? "Quelqu'un",
            avatarUrl: data?.avatar_url ?? null,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  // Auto-dismiss après 9 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[60] w-[320px] bg-surface border border-border rounded-2xl shadow-[0_18px_44px_rgba(25,34,46,.22)] p-3.5 swc-pop">
      <div className="flex items-start gap-3">
        <Avatar url={toast.avatarUrl} name={toast.username} identity={toast.requesterId} size={42} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-snug text-foreground">
            <span className="font-bold">{toast.username}</span> vous a envoyé une demande d&apos;ami.
          </p>
          <Link
            href="/friends"
            onClick={() => setToast(null)}
            className="inline-block mt-2 bg-accent text-white font-semibold text-[13px] px-3.5 py-1.5 rounded-[9px] hover:opacity-90 transition"
          >
            Voir la demande
          </Link>
        </div>
        <button
          onClick={() => setToast(null)}
          className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground transition shrink-0"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
