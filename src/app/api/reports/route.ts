import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_REASONS = [
  "Comportement offensant ou agressif",
  "Harcèlement",
  "Spam ou publicité",
  "Contenu inapproprié",
  "Usurpation d'identité",
  "Autre",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { reportedUserId, reason, description, roomId } = body;

  if (!reportedUserId || typeof reportedUserId !== "string") {
    return NextResponse.json({ error: "Utilisateur cible requis." }, { status: 400 });
  }
  if (reportedUserId === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas vous signaler vous-même." }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Motif invalide." }, { status: 400 });
  }

  // Capture les 10 derniers messages de l'utilisateur signalé dans la salle
  // via le client admin pour bypasser le RLS sur messages.
  let lastMessages: { content: string; created_at: string }[] | null = null;
  if (roomId && typeof roomId === "string") {
    const admin = createAdminClient();
    const { data: msgs } = await admin
      .from("messages")
      .select("content, created_at")
      .eq("room_id", roomId)
      .eq("user_id", reportedUserId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (msgs && msgs.length > 0) {
      lastMessages = msgs.reverse(); // ordre chronologique pour la lecture
    }
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_user_id: reportedUserId,
    reason,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    room_id: roomId ?? null,
    last_messages: lastMessages,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Vous avez déjà signalé cet utilisateur." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
