import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const { reportedUserId, reason, description } = body;

  if (!reportedUserId || typeof reportedUserId !== "string") {
    return NextResponse.json({ error: "Utilisateur cible requis." }, { status: 400 });
  }
  if (reportedUserId === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas vous signaler vous-même." }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Motif invalide." }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_user_id: reportedUserId,
    reason,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Vous avez déjà signalé cet utilisateur." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
