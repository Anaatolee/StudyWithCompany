import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { containsProfanity, MSG_PROFANITY_ERROR } from "@/lib/moderation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  if (containsProfanity(content)) return NextResponse.json({ error: MSG_PROFANITY_ERROR }, { status: 422 });

  const { error } = await supabase.from("messages").insert({
    room_id: roomId,
    user_id: user.id,
    content,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
