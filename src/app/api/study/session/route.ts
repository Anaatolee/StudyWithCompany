import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Starts a study session when a user enters a room. Returns the session id,
// which the client then keeps alive via the heartbeat endpoint.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { roomId } = (await request.json()) as { roomId?: string };

  // Resolve the room's subject so stats can break time down per subject.
  let subjectId: string | null = null;
  if (roomId) {
    const { data: room } = await supabase
      .from("rooms")
      .select("subject_id")
      .eq("id", roomId)
      .single();
    subjectId = room?.subject_id ?? null;
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      room_id: roomId ?? null,
      subject_id: subjectId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[study/session]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId: data.id });
}
